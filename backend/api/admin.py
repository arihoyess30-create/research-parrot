from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from datetime import datetime
from db import get_db
from models import User, Project, Payment
from api.auth import require_admin

router = APIRouter()

class VerifyPaymentBody(BaseModel):
    payment_id: str
    approve: bool

@router.get("/stats")
def stats(db: Session = Depends(get_db), _=Depends(require_admin)):
    return {
        "total_users":      db.query(func.count(User.id)).scalar(),
        "total_projects":   db.query(func.count(Project.id)).scalar(),
        "paid_papers":      db.query(func.count(Project.id)).filter_by(is_paid=True).scalar(),
        "total_revenue_ugx": db.query(func.sum(Payment.amount)).filter_by(status="confirmed").scalar() or 0,
        "pending_payments": db.query(func.count(Payment.id)).filter(
                                Payment.status.in_(["pending_verification","pending"])).scalar(),
    }

@router.get("/users")
def list_users(db: Session = Depends(get_db), _=Depends(require_admin)):
    return [{"id": u.id, "full_name": u.full_name, "email": u.email,
             "is_admin": u.is_admin, "created_at": u.created_at,
             "paper_count": len(u.projects)} for u in db.query(User).all()]

@router.get("/payments")
def list_payments(db: Session = Depends(get_db), _=Depends(require_admin)):
    pays = db.query(Payment).order_by(Payment.created_at.desc()).limit(200).all()
    return [{"id": p.id, "user": p.user.full_name if p.user else "—",
             "phone": p.phone, "amount": p.amount, "method": p.method,
             "txn_ref": p.txn_ref, "external_ref": p.external_ref,
             "status": p.status, "project_title": p.project.title if p.project else "—",
             "created_at": p.created_at, "confirmed_at": p.confirmed_at} for p in pays]

@router.post("/payments/verify")
def verify_payment(body: VerifyPaymentBody, db: Session = Depends(get_db),
                   _=Depends(require_admin)):
    pay = db.query(Payment).filter_by(id=body.payment_id).first()
    if not pay: raise HTTPException(404, "Payment not found")
    if body.approve:
        pay.status       = "confirmed"
        pay.confirmed_at = datetime.utcnow()
        proj = db.query(Project).filter_by(id=pay.project_id).first()
        if proj: proj.is_paid = True
    else:
        pay.status = "failed"
    db.commit()
    return {"status": pay.status}

@router.get("/projects")
def list_all_projects(db: Session = Depends(get_db), _=Depends(require_admin)):
    projs = db.query(Project).order_by(Project.created_at.desc()).limit(500).all()
    return [{"id": p.id, "title": p.title, "field": p.field, "level": p.level,
             "citation_style": p.citation_style, "pages": p.pages,
             "status": p.status, "is_paid": p.is_paid,
             "user": p.user.full_name if p.user else "—",
             "created_at": p.created_at} for p in projs]

@router.delete("/users/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db), _=Depends(require_admin)):
    user = db.query(User).filter_by(id=user_id).first()
    if not user: raise HTTPException(404, "User not found")
    db.delete(user); db.commit()
    return {"deleted": True}
    







