import os
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from db import get_db
from models import User

router = APIRouter()

SECRET_KEY   = os.getenv("JWT_SECRET", "changeme-use-a-long-random-string")
ALGORITHM    = "HS256"
TOKEN_EXPIRE = 60 * 24 * 7  # 7 days

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2  = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    full_name: str
    is_admin: bool

def hash_pw(pw): return pwd_ctx.hash(pw)
def verify_pw(plain, hashed): return pwd_ctx.verify(plain, hashed)

def create_token(user_id: str) -> str:
    exp = datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRE)
    return jwt.encode({"sub": user_id, "exp": exp}, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2), db: Session = Depends(get_db)) -> User:
    exc = HTTPException(status_code=401, detail="Invalid credentials",
                        headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        uid = payload.get("sub")
        if not uid: raise exc
    except JWTError:
        raise exc
    user = db.query(User).filter_by(id=uid).first()
    if not user: raise exc
    return user

def require_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(403, "Admin access required")
    return user

@router.post("/register", response_model=TokenResponse)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter_by(email=body.email).first():
        raise HTTPException(400, "Email already registered")
    user = User(full_name=body.full_name, email=body.email, hashed_pw=hash_pw(body.password))
    db.add(user); db.commit(); db.refresh(user)
    return TokenResponse(access_token=create_token(user.id),
                         user_id=user.id, full_name=user.full_name, is_admin=user.is_admin)

@router.post("/login", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter_by(email=form.username).first()
    if not user or not verify_pw(form.password, user.hashed_pw):
        raise HTTPException(401, "Incorrect email or password")
    return TokenResponse(access_token=create_token(user.id),
                         user_id=user.id, full_name=user.full_name, is_admin=user.is_admin)

@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return {"id": user.id, "email": user.email,
            "full_name": user.full_name, "is_admin": user.is_admin}
