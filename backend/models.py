from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func
import uuid

Base = declarative_base()

def gen_id():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    id         = Column(String, primary_key=True, default=gen_id)
    email      = Column(String, unique=True, nullable=False)
    full_name  = Column(String, nullable=False)
    hashed_pw  = Column(String, nullable=False)
    is_admin   = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    projects   = relationship("Project", back_populates="user")
    payments   = relationship("Payment", back_populates="user")

class Project(Base):
    __tablename__ = "projects"
    id             = Column(String, primary_key=True, default=gen_id)
    user_id        = Column(String, ForeignKey("users.id"), nullable=False)
    title          = Column(String, nullable=False)
    topic          = Column(Text)
    questions      = Column(Text)
    field          = Column(String)
    level          = Column(String)
    citation_style = Column(String)
    pages          = Column(Integer, default=20)
    outline        = Column(Text)
    sections       = Column(Text)
    status         = Column(String, default="draft")
    is_paid        = Column(Boolean, default=False)
    created_at     = Column(DateTime, server_default=func.now())
    updated_at     = Column(DateTime, onupdate=func.now())
    user           = relationship("User", back_populates="projects")
    payments       = relationship("Payment", back_populates="project")

class Payment(Base):
    __tablename__ = "payments"
    id            = Column(String, primary_key=True, default=gen_id)
    user_id       = Column(String, ForeignKey("users.id"), nullable=False)
    project_id    = Column(String, ForeignKey("projects.id"), nullable=False)
    amount        = Column(Float, default=15000)
    currency      = Column(String, default="UGX")
    method        = Column(String)
    phone         = Column(String)
    merchant_no   = Column(String, default="0776871411")
    txn_ref       = Column(String)
    external_ref  = Column(String)
    status        = Column(String, default="pending")
    confirmed_at  = Column(DateTime, nullable=True)
    created_at    = Column(DateTime, server_default=func.now())
    user          = relationship("User", back_populates="payments")
    project       = relationship("Project", back_populates="payments")
