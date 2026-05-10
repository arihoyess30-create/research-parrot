import httpx, uuid, os, json
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime
from db import get_db, SessionLocal
from models import Payment, Project, User
from api.auth import get_current_user

router = APIRouter()

MERCHANT_NUMBER = os.getenv("MERCHANT_NUMBER", "0776871411")
AMOUNT_UGX      = int(os.getenv("PAPER_PRICE_UGX", "15000"))

MTN_BASE_URL         = "https://sandbox.momodeveloper.mtn.com"
MTN_SUBSCRIPTION_KEY = os.getenv("MTN_SUBSCRIPTION_KEY", "")
MTN_API_USER         = os.getenv("MTN_API_USER", "")
MTN_API_KEY          = os.getenv("MTN_API_KEY", "")
MTN_TARGET_ENV       = os.getenv("MTN_TARGET_ENV", "sandbox")

AIRTEL_BASE_URL      = "https://openapi.airtel.africa"
AIRTEL_CLIENT_ID     = os.getenv("AIRTEL_CLIENT_ID", "")
AIRTEL_CLIENT_SECRET = os.getenv("AIRTEL_CLIENT_SECRET", "")

class InitiatePaymentRequest(BaseModel):
    project_id: str
    method: str
    phone: str

class ConfirmManualRequest(BaseModel):
    payment_id: str
    txn_ref: str

def normalise_phone(phone: str) -> str:
    return "256" + phone.lstrip("0") if phone.startswith("0") else phone

async def mtn_get_token() -> str:
    import base64
    creds = base64.b64encode(f"{MTN_API_USER}:{MTN_API_KEY}".encode()).decode()
    async with httpx.AsyncClient() as c:
        r = await c.post(f"{MTN_BASE_URL}/collection/token/",
                         headers={"Authorization": f"Basic {creds}",
                                  "Ocp-Apim-Subscription-Key": MTN_SUBSCRIPTION_KEY})
    r.raise_for_status()
    return r.json()["access_token"]

async def mtn_request_to_pay(phone: str, amount: int, ext_ref: str) -> dict:
    token  = await mtn_get_token()
    ref_id = str(uuid.uuid4())
    async with httpx.AsyncClient() as c:
        r = await c.post(f"{MTN_BASE_URL}/collection/v1_0/requesttopay",
            json={"amount": str(amount), "currency": "UGX", "externalId": ext_ref,
                  "payer": {"partyIdType": "MSISDN", "partyId": normalise_phone(phone)},
                  "payerMessage": "Research Parrot paper unlock",
                  "payeeNote": "Research Parrot"},
            headers={"Authorization": f"Bearer {token}",
                     "X-Reference-Id": ref_id,
                     "X-Target-Environment": MTN_TARGET_ENV,
                     "Ocp-Apim-Subscription-Key": MTN_SUBSCRIPTION_KEY,
                     "Content-Type": "application/json"})
    r.raise_for_status()
    return {"reference_id": ref_id}

async def mtn_check_status(ref_id: str) -> str:
    token = await mtn_get_token()
    async with httpx.AsyncClient() as c:
        r = await c.get(f"{MTN_BASE_URL}/collection/v1_0/requesttopay/{ref_id}",
                        headers={"Authorization": f"Bearer {token}",
                                 "X-Target-Environment": MTN_TARGET_ENV,
                                 "Ocp-Apim-Subscription-Key": MTN_SUBSCRIPTION_KEY})
    return r.json().get("status", "PENDING").upper()

async def airtel_get_token() -> str:
    async with httpx.AsyncClient() as c:
        r = await c.post(f"{AIRTEL_BASE_URL}/auth/oauth2/token",
                         json={"client_id": AIRTEL_CLIENT_ID,
                               "client_secret": AIRTEL_CLIENT_SECRET,
                               "grant_type": "client_credentials"},
                         headers={"Content-Type": "application/json"})
    r.raise_for_status()
    return r.json()["access_token"]

async def airtel_request_payment(phone: str, amount: int, ref: str) -> dict:
    token = await airtel_get_token()
    async with httpx.AsyncClient() as c:
        r = await c.post(f"{AIRTEL_BASE_URL}/merchant/v1/payments/",
            json={"reference": ref,
                  "subscriber": {"country": "UG", "currency": "UGX", "msisdn": normalise_phone(phone)},
                  "transaction": {"amount": amount, "country": "UG", "currency": "UGX", "id": ref}},
            headers={"Authorization": f"Bearer {token}",
                     "Content-Type": "application/json",
                     "X-Country": "UG", "X-Currency": "UGX"})
    return {"reference_id": ref}

async def airtel_check_status(ref: str) -> str:
    token = await airtel_get_token()
    async with httpx.AsyncClient() as c:
        r = await c.get(f"{AIRTEL_BASE_URL}/standard/v1/payments/{ref}",
                        headers={"Authorization": f"Bearer {token}",
                                 "X-Country": "UG", "X-Currency": "UGX"})
    code = r.json().get("data", {}).get("transaction", {}).get("status", "PENDING")
    return "SUCCESSFUL" if code == "TS" else ("FAILED" if code == "TF" else "PENDING")

async def poll_payment_status(payment_id: str, method: str, ref_id: str):
    import asyncio
    for _ in range(30):
        await asyncio.sleep(10)
        try:
            st = await mtn_check_status(ref_id) if method == "mtn" else await airtel_check_status(ref_id)
        except Exception:
            continue
        if st in ("SUCCESSFUL", "FAILED"):
            db = SessionLocal()
            pay = db.query(Payment).filter_by(id=payment_id).first()
            if pay:
                pay.status = "confirmed" if st == "SUCCESSFUL" else "failed"
                if st == "SUCCESSFUL":
                    pay.confirmed_at = datetime.utcnow()
                    proj = db.query(Project).filter_by(id=pay.project_id).first()
                    if proj: proj.is_paid = True
                db.commit()
            db.close()
            return

@router.post("/initiate")
async def initiate_payment(body: InitiatePaymentRequest, bg: BackgroundTasks,
                           db: Session = Depends(get_db),
                           user: User = Depends(get_current_user)):
    proj = db.query(Project).filter_by(id=body.project_id, user_id=user.id).first()
    if not proj: raise HTTPException(404, "Project not found")
    if proj.is_paid: return {"status": "already_paid"}

    pay = Payment(user_id=user.id, project_id=proj.id,
                  method=body.method, phone=body.phone, merchant_no=MERCHANT_NUMBER)
    db.add(pay); db.commit(); db.refresh(pay)

    # Try automatic STK push
    try:
        if body.method not in ("mtn", "airtel"):
            raise ValueError("Unsupported method")
        ext_ref = str(uuid.uuid4())[:12]
        if body.method == "mtn":
            result = await mtn_request_to_pay(body.phone, AMOUNT_UGX, ext_ref)
        else:
            result = await airtel_request_payment(body.phone, AMOUNT_UGX, ext_ref)
        pay.external_ref = result["reference_id"]
        db.commit()
        bg.add_task(poll_payment_status, pay.id, body.method, result["reference_id"])
        return {"payment_id": pay.id, "status": "pending",
                "message": "Payment prompt sent to your phone. Approve it to continue.",
                "merchant_number": MERCHANT_NUMBER, "amount": AMOUNT_UGX}
    except Exception:
        # Fallback to manual
        pay.status = "pending_manual"
        db.commit()
        return {"payment_id": pay.id, "status": "manual",
                "message": "Please pay manually via USSD then enter your transaction ID.",
                "merchant_number": MERCHANT_NUMBER, "amount": AMOUNT_UGX}

@router.post("/confirm-manual")
def confirm_manual(body: ConfirmManualRequest, db: Session = Depends(get_db),
                   user: User = Depends(get_current_user)):
    pay = db.query(Payment).filter_by(id=body.payment_id, user_id=user.id).first()
    if not pay: raise HTTPException(404, "Payment not found")
    pay.txn_ref = body.txn_ref
    pay.status  = "pending_verification"
    db.commit()
    return {"status": "pending_verification",
            "message": "Submitted for verification. Access granted within 30 minutes."}

@router.get("/status/{payment_id}")
async def payment_status(payment_id: str, db: Session = Depends(get_db),
                         user: User = Depends(get_current_user)):
    pay = db.query(Payment).filter_by(id=payment_id, user_id=user.id).first()
    if not pay: raise HTTPException(404, "Not found")
    if pay.status == "pending" and pay.external_ref:
        try:
            st = await mtn_check_status(pay.external_ref) if pay.method == "mtn" \
                 else await airtel_check_status(pay.external_ref)
            if st == "SUCCESSFUL":
                pay.status = "confirmed"
                pay.confirmed_at = datetime.utcnow()
                proj = db.query(Project).filter_by(id=pay.project_id).first()
                if proj: proj.is_paid = True
                db.commit()
        except Exception:
            pass
    return {"payment_id": pay.id, "status": pay.status,
            "method": pay.method, "amount": pay.amount, "confirmed_at": pay.confirmed_at}
