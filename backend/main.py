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
 
@app.get("/health")
def health():
    return {"status": "ok"}
    return {"status": "ok"}
