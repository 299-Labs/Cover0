from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db import get_db
from app import models, schemas

router = APIRouter(prefix="/api/v1/market", tags=["Market"])

@router.get("/players", response_model=List[schemas.PlayerResponse])
def list_players(db: Session = Depends(get_db)):
    """Fetch all available players in the market."""
    return db.query(models.Player).all()

@router.get("/players/{player_id}", response_model=schemas.PlayerResponse)
def get_player(player_id: UUID, db: Session = Depends(get_db)):
    """Fetch specific player details by UUID."""
    player = db.query(models.Player).filter(models.Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")
    return player