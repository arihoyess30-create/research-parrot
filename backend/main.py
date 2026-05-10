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
    from db import init_db, SessionLocal
    from models import User
    from api.auth import hash_pw
    init_db()
    db = SessionLocal()
    try:
        existing = db.query(User).filter_by(email="admin@researchparrot.com").first()
        if not existing:
            admin_user = User(
                full_name="Admin",
                email="admin@researchparrot.com",
                hashed_pw=hash_pw("admin123"),
                is_admin=True,
            )
            db.add(admin_user)
            db.commit()
    finally:
        db.close()

@app.get("/health")
def health():
    return {"status": "ok"}
