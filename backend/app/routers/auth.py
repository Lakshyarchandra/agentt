from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    UserRegister, UserLogin, UserOut, TokenResponse,
    RefreshRequest, ApiKeysUpdate, ApiKeysOut
)
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token,
    encrypt_api_keys, decrypt_api_keys
)
from app.core.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    await db.flush()
    return user


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    token_data = {"sub": str(user.id)}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    token_payload = decode_token(payload.refresh_token)
    if not token_payload or token_payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = token_payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")

    token_data = {"sub": str(user.id)}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/api-keys", response_model=ApiKeysOut)
async def update_api_keys(
    payload: ApiKeysUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Merge with existing keys
    existing = decrypt_api_keys(current_user.encrypted_api_keys or "")
    existing.update(payload.keys)
    current_user.encrypted_api_keys = encrypt_api_keys(existing)
    db.add(current_user)
    return ApiKeysOut(vendors=list(existing.keys()))


@router.get("/api-keys", response_model=ApiKeysOut)
async def get_api_keys(current_user: User = Depends(get_current_user)):
    keys = decrypt_api_keys(current_user.encrypted_api_keys or "")
    return ApiKeysOut(vendors=list(keys.keys()))


@router.delete("/api-keys/{vendor}", response_model=ApiKeysOut)
async def delete_api_key(
    vendor: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    keys = decrypt_api_keys(current_user.encrypted_api_keys or "")
    keys.pop(vendor, None)
    current_user.encrypted_api_keys = encrypt_api_keys(keys) if keys else None
    db.add(current_user)
    return ApiKeysOut(vendors=list(keys.keys()))
