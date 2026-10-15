import re
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app import models
from app.auth import get_current_user
from app.db import get_db

router = APIRouter(prefix="/api/v1/users", tags=["Users"])

USERNAME_REGEX = re.compile(r"^[a-zA-Z0-9_]{3,20}$")


class UpdateProfileRequest(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=20)
    avatar_url: Optional[str] = None


class UserProfileResponse(BaseModel):
    id: str
    username: str
    email: str
    avatar_url: Optional[str]
    cash_balance: Decimal
    is_onboarded: bool
    created_at: str


@router.get("/check-username")
def check_username(
    username: str = Query(..., min_length=1, max_length=30),
    db: Session = Depends(get_db),
):
    """Public endpoint to check if a username is valid and available."""
    clean_username = username.strip()

    if not USERNAME_REGEX.match(clean_username):
        return {
            "available": False,
            "message": "Must be 3–20 characters using only letters, numbers, or underscores.",
        }

    exists = (
        db.query(models.User)
        .filter(func.lower(models.User.username) == clean_username.lower())
        .first()
    )
    if exists:
        return {"available": False, "message": "Handle is already taken."}

    return {"available": True, "message": "Handle is available!"}


@router.get("/me", response_model=UserProfileResponse)
def get_my_profile(current_user: models.User = Depends(get_current_user)):
    """Fetch profile of currently signed-in user."""
    return UserProfileResponse(
        id=str(current_user.id),
        username=current_user.username,
        email=current_user.email,
        avatar_url=current_user.avatar_url,
        cash_balance=current_user.cash_balance,
        is_onboarded=current_user.is_onboarded,
        created_at=current_user.created_at.isoformat() if current_user.created_at else "",
    )


@router.patch("/me", response_model=UserProfileResponse)
def update_my_profile(
    payload: UpdateProfileRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Updates username and sets is_onboarded to True."""
    if payload.username:
        clean_username = payload.username.strip()
        if not USERNAME_REGEX.match(clean_username):
            raise HTTPException(
                status_code=400,
                detail="Username must be 3–20 characters and contain only letters, numbers, or underscores.",
            )

        existing = (
            db.query(models.User)
            .filter(
                func.lower(models.User.username) == clean_username.lower(),
                models.User.id != current_user.id,
            )
            .first()
        )
        if existing:
            raise HTTPException(status_code=400, detail="Username is already claimed.")

        current_user.username = clean_username
        current_user.is_onboarded = True

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
        is_onboarded=current_user.is_onboarded,
        created_at=current_user.created_at.isoformat() if current_user.created_at else "",
    )


@router.delete("/me", status_code=status.HTTP_200_OK)
def delete_my_account(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Permanently deletes user and cascades all holdings, transactions, and leagues.
    Uses direct deletion to let PostgreSQL ON DELETE CASCADE handle cleanup cleanly.
    """
    user_id = current_user.id

    try:
        # 1. Delete user from public.users (triggers native Postgres CASCADE)
        db.query(models.User).filter(models.User.id == user_id).delete(synchronize_session=False)
        db.commit()

        # 2. Attempt auth cleanup in a dedicated SAVEPOINT so failure never poisons the transaction
        try:
            with db.begin_nested():
                db.execute(text("DELETE FROM auth.users WHERE id = :uid"), {"uid": str(user_id)})
            db.commit()
        except Exception:
            # Safely ignored on local Postgres where auth.users does not exist
            pass

        return {"status": "ok", "message": "Account successfully deleted."}

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user account: {str(e)}",
        )
