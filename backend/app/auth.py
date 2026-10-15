import os
import secrets
import jwt
from uuid import UUID
from decimal import Decimal
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db import get_db
from app import models

security = HTTPBearer()
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> models.User:
    """Decodes Supabase JWT token and retrieves or auto-provisions the authenticated user."""
    token = credentials.credentials
    try:
        if SUPABASE_JWT_SECRET:
            payload = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
                options={"verify_exp": True},
            )
        else:
            # Fallback unverified decode for development if secret is not set
            payload = jwt.decode(token, options={"verify_signature": False})

        user_id_str = payload.get("sub")
        if not user_id_str:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")

        user_id = UUID(user_id_str)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication token failed validation: {e}",
        )

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        email = payload.get("email", "")
        metadata = payload.get("user_metadata", {})
        custom_username = metadata.get("username")
        avatar_url = metadata.get("avatar_url") or metadata.get("picture")

        if custom_username:
            # 1. Email signup flow: user explicitly chose their handle
            username = custom_username.strip()
            is_onboarded = True

            # Collision safeguard
            base_username = username
            counter = 1
            while db.query(models.User).filter(models.User.username == username).first():
                username = f"{base_username}{counter}"
                counter += 1
        else:
            # 2. Google OAuth flow: generate temporary handle & mark for onboarding
            prefix = "".join(c for c in email.split("@")[0] if c.isalnum() or c == "_")[:10] or "trader"
            username = f"{prefix}_{secrets.token_hex(2)}"
            while db.query(models.User).filter(models.User.username == username).first():
                username = f"{prefix}_{secrets.token_hex(2)}"
            is_onboarded = False

        user = models.User(
            id=user_id,
            username=username,
            email=email,
            avatar_url=avatar_url,
            cash_balance=Decimal("100000000.00"),
            is_onboarded=is_onboarded,
        )

        try:
            db.add(user)
            db.commit()
            db.refresh(user)
        except Exception:
            db.rollback()
            user = db.query(models.User).filter(models.User.id == user_id).first()
            if not user:
                raise HTTPException(status_code=500, detail="Database provisioning failed.")

    return user