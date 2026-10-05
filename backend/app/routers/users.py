from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db import get_db
from app import models

router = APIRouter(prefix="/api/v1/users", tags=["Users"])

@router.get("/demo")
def get_demo_user(db: Session = Depends(get_db)):
    """Fetch the seeded demo user for local API testing."""
    user = db.query(models.User).filter(models.User.username == "demo_trader").first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Demo user not found. Did you run 'python app/seed.py'?"
        )
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "cash_balance": user.cash_balance
    }