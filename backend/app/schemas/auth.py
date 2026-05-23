from pydantic import BaseModel, EmailStr
from typing import Optional, Dict
import uuid
from datetime import datetime


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    full_name: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class ApiKeysUpdate(BaseModel):
    keys: Dict[str, str]
    # e.g. {"groq": "gsk_...", "google": "AI...", "mistral": "...", "openrouter": "sk-or-..."}


class ApiKeysOut(BaseModel):
    vendors: list[str]  # Just the vendor names, not the actual keys
