from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
from models import User
import hashlib, jwt, datetime, os

SECRET = "satark-demo-secret-2025"
ALGORITHM = "HS256"

router = APIRouter()
security = HTTPBearer(auto_error=False)

def hash_password(p): return hashlib.sha256(p.encode()).hexdigest()

def create_token(user_id, role):
    payload = {"sub": user_id, "role": role, "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)}
    return jwt.encode(payload, SECRET, algorithm=ALGORITHM)

def decode_token(token: str):
    try: return jwt.decode(token, SECRET, algorithms=[ALGORITHM])
    except: return None

def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    if not creds: raise HTTPException(401, "Not authenticated")
    payload = decode_token(creds.credentials)
    if not payload: raise HTTPException(401, "Invalid token")
    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user: raise HTTPException(401, "User not found")
    return user

@router.post("/auth/login")
def login(body: dict, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == body.get("username")).first()
    if not user or user.password_hash != hash_password(body.get("password", "")):
        raise HTTPException(401, "Invalid credentials")
    token = create_token(user.id, user.role)
    return {"token": token, "role": user.role, "name": user.name, "id": user.id}

@router.get("/auth/me")
def me(current_user = Depends(get_current_user)):
    return {"id": current_user.id, "name": current_user.name, "role": current_user.role, "username": current_user.username}
