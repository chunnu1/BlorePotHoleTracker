from pydantic import BaseModel
from typing import Optional

class PotholeReport(BaseModel):
    lat: float
    lng: float
    image_data: Optional[str] = None

class LoginData(BaseModel):
    password: str

class ChangePasswordData(BaseModel):
    new_password: str
