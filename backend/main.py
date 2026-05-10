from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api import auth, research, payment, admin, export

app = FastAPI(title="Research Parrot API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,     prefix="/api/auth",     tags=["Auth"])
app.include_router(research.router, prefix="/api/research", tags=["Research"])
app.include_router(payment.router,  prefix="/api/payment",  tags=["Payment"])
app.include_router(export.router,   prefix="/api/export",   tags=["Export"])
app.include_router(admin.router,    prefix="/api/admin",    tags=["Admin"])

@app.on_event("startup")
def on_startup():
    try:
        from db import init_db, SessionLocal
        from models import User
        from api.auth import hash_pw
        init_db()
        db = SessionLocal()
        try:
            existing = db.query(User).filter_by(email="admin@researchparrot.com").first()
            if not existing:
                u = User(
                    full_name="Admin",
                    email="admin@researchparrot.com",
                    hashed_pw=hash_pw("admin123"),
                    is_admin=True,
                )
                db.add(u)
                db.commit()
        except Exception as e:
            print(f"Admin creation error (non-fatal): {e}")
        finally:
            db.close()
    except Exception as e:
        print(f"Startup error (non-fatal): {e}")

@app.get("/health")
def health():
    from db import SessionLocal
    try:
        db = SessionLocal()
        db.execute(__import__("sqlalchemy").text("SELECT 1"))
        db.close()
        return {"status": "ok", "db": "connected"}
    except Exception as e:
        return {"status": "ok", "db": f"error: {str(e)}"}
