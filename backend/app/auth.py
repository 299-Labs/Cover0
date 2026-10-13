import os
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
    """Decodes Supabase JWT token and retrieves the authenticated database user."""
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
        username = metadata.get("username") or email.split("@")[0]

        # 1. Ensure username is strictly unique in local DB to prevent constraint crashes
        base_username = username
        counter = 1
        while db.query(models.User).filter(models.User.username == username).first():
            username = f"{base_username}{counter}"
            counter += 1

        # 2. Safely attempt insert
        user = models.User(
            id=user_id,
            username=username,
            email=email,
            cash_balance=Decimal("100000000.00"),
        )
        
        try:
            db.add(user)
            db.commit()
            db.refresh(user)
        except Exception as e:
            # If a race condition occurs and another request inserted it first,
            # rollback and fetch the newly created user instead of crashing.
            db.rollback()
            user = db.query(models.User).filter(models.User.id == user_id).first()
            if not user:
                raise HTTPException(status_code=500, detail="Database provisioning failed.")

    return user