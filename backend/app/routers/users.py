from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app import models, schemas
from app.db import get_db
from app.auth import get_current_user

router = APIRouter(prefix="/api/v1/users", tags=["Users"])

class UpdateProfileRequest(BaseModel):
    username: Optional[str] = None
    avatar_url: Optional[str] = None

class UserProfileResponse(BaseModel):
    id: str
    username: str
    email: str
    avatar_url: Optional[str]
    cash_balance: Decimal
    created_at: str

@router.get("/me", response_model=UserProfileResponse)
def get_my_profile(current_user: models.User = Depends(get_current_user)):
    """Fetch profile of currently signed-in user."""
    return UserProfileResponse(
        id=str(current_user.id),
        username=current_user.username,
        email=current_user.email,
        avatar_url=current_user.avatar_url,
        cash_balance=current_user.cash_balance,
        created_at=current_user.created_at.isoformat() if current_user.created_at else "",
    )

@router.patch("/me", response_model=UserProfileResponse)
def update_my_profile(
    payload: UpdateProfileRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Updates username or avatar_url."""
    if payload.username:
        existing = (
            db.query(models.User)
            .filter(models.User.username == payload.username, models.User.id != current_user.id)
            .first()
        )
        if existing:
            raise HTTPException(status_code=400, detail="Username is already claimed.")
        current_user.username = payload.username

    if payload.avatar_url is not None:
        current_user.avatar_url = payload.avatar_url

    db.commit()
    db.refresh(current_user)

    return UserProfileResponse(
        id=str(current_user.id),
        username=current_user.username,
        email=current_user.email,
        avatar_url=current_user.avatar_url,
        cash_balance=current_user.cash_balance,
        created_at=current_user.created_at.isoformat() if current_user.created_at else "",
    )

# Maintain legacy demo endpoint
@router.get("/demo")
def get_demo_user(db: Session = Depends(get_db)):
    demo = db.query(models.User).filter(models.User.username == "demo_trader").first()
    if not demo:
        raise HTTPException(status_code=404, detail="Demo user not found.")
    return {"id": demo.id, "username": demo.username, "email": demo.email, "cash_balance": demo.cash_balance}