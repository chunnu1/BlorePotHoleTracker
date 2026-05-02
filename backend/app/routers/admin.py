import secrets
import hashlib
from typing import Optional
from fastapi import APIRouter, Header, HTTPException
from app.database import get_db_connection
from app.models import LoginData, ChangePasswordData
from app.routers.potholes import get_potholes

router = APIRouter()

admin_tokens = set()

def get_password_hash(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def check_admin_token(token: Optional[str] = Header(None)):
    if token not in admin_tokens:
        raise HTTPException(status_code=401, detail="Unauthorized")

@router.post("/api/admin/login")
def admin_login(data: LoginData):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT password_hash FROM admin LIMIT 1")
    stored_hash = cursor.fetchone()['password_hash']
    conn.close()
    
    if get_password_hash(data.password) == stored_hash:
        token = secrets.token_hex(16)
        admin_tokens.add(token)
        return {"token": token}
    raise HTTPException(status_code=401, detail="Invalid password")

@router.post("/api/admin/change-password")
def admin_change_password(data: ChangePasswordData, token: Optional[str] = Header(None)):
    check_admin_token(token)
    new_hash = get_password_hash(data.new_password)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE admin SET password_hash = ?", (new_hash,))
    conn.commit()
    conn.close()
    return {"status": "success"}

@router.get("/api/admin/potholes")
def admin_get_potholes(token: Optional[str] = Header(None)):
    check_admin_token(token)
    return get_potholes()

@router.delete("/api/admin/potholes/{pothole_id}")
def admin_delete_pothole(pothole_id: int, token: Optional[str] = Header(None)):
    check_admin_token(token)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM potholes WHERE id = ?", (pothole_id,))
    conn.commit()
    conn.close()
    return {"status": "deleted"}
