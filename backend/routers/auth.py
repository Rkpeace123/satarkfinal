from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
from models import User
import hashlib, hmac, base64, json, datetime

SECRET = b"satark-demo-secret-2025"

router = APIRouter()
security = HTTPBearer(auto_error=False)

def hash_password(p: str) -> str:
    return hashlib.sha256(p.encode()).hexdigest()

def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def _unb64url(s: str) -> bytes:
    pad = 4 - len(s) % 4
    return base64.urlsafe_b64decode(s + "=" * (pad % 4))

def create_token(user_id: str, role: str) -> str:
    header = _b64url(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    exp = int((datetime.datetime.utcnow() + datetime.timedelta(hours=24)).timestamp())
    payload = _b64url(json.dumps({"sub": user_id, "role": role, "exp": exp}).encode())
    msg = f"{header}.{payload}".encode()
    sig = _b64url(hmac.new(SECRET, msg, hashlib.sha256).digest())
    return f"{header}.{payload}.{sig}"

def decode_token(token: str) -> dict | None:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header, payload, sig = parts
        msg = f"{header}.{payload}".encode()
        expected = _b64url(hmac.new(SECRET, msg, hashlib.sha256).digest())
        if not hmac.compare_digest(sig, expected):
            return None
        data = json.loads(_unb64url(payload))
        if data.get("exp", 0) < datetime.datetime.utcnow().timestamp():
            return None
        return data
    except Exception:
        return None

def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    if not creds:
        raise HTTPException(401, "Not authenticated")
    payload = decode_token(creds.credentials)
    if not payload:
        raise HTTPException(401, "Invalid or expired token")
    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user:
        raise HTTPException(401, "User not found")
    return user

@router.post("/auth/login")
def login(body: dict, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == body.get("username")).first()
    if not user or user.password_hash != hash_password(body.get("password", "")):
        raise HTTPException(401, "Invalid credentials")
    token = create_token(user.id, user.role)
    return {"token": token, "role": user.role, "name": user.name, "id": user.id}

@router.get("/auth/me")
def me(current_user=Depends(get_current_user)):
    return {"id": current_user.id, "name": current_user.name, "role": current_user.role, "username": current_user.username}
