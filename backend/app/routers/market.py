from typing import List
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db import get_db
from app import models, schemas

router = APIRouter(prefix="/api/v1/market", tags=["Market"])

def get_headshot_url(external_id: str) -> str:
    """Generates Sleeper CDN avatar URL from player external ID."""
    if not external_id or external_id.startswith("sleeper_"):
        return "https://sleepercdn.com/images/v2/icons/player_default.webp"
    return f"https://sleepercdn.com/content/nfl/players/thumb/{external_id}.jpg"

@router.get("/players", response_model=List[schemas.PlayerResponse])
def list_players(db: Session = Depends(get_db)):
    """Fetch all players in the market with dynamic headshot URLs."""
    players = db.query(models.Player).all()
    res = []
    for p in players:
        p_dict = schemas.PlayerResponse.model_validate(p)
        p_dict.headshot_url = get_headshot_url(p.external_id)
        res.append(p_dict)
    return res

@router.get("/players/{player_id}", response_model=schemas.PlayerDetailResponse)
def get_player(player_id: UUID, db: Session = Depends(get_db)):
    """Fetch detailed player profile, price history trend from transactions, and stats."""
    player = db.query(models.Player).filter(models.Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")

    # Query transaction ledger for historical price points
    transactions = (
        db.query(models.Transaction)
        .filter(models.Transaction.player_id == player_id)
        .order_by(models.Transaction.timestamp.asc())
        .all()
    )

    # Historical timeline starting point
    history = [
        schemas.PricePoint(
            timestamp=player.created_at or datetime.now(timezone.utc),
            price=player.current_price if not transactions else transactions[0].price_per_share
        )
    ]

    for tx in transactions:
        history.append(schemas.PricePoint(timestamp=tx.timestamp, price=tx.price_per_share))

    # Add current price point
    history.append(schemas.PricePoint(timestamp=datetime.now(timezone.utc), price=player.current_price))

    player_data = schemas.PlayerDetailResponse.model_validate(player)
    player_data.headshot_url = get_headshot_url(player.external_id)
    player_data.price_history = history
    player_data.stats = schemas.PlayerStatSummary(
        games_played=17,
        projected_fpts=268.4 if player.position == "QB" else 210.0,
        last_game_fpts=24.2,
        touchdowns=28 if player.position == "QB" else 10,
        primary_stat_label="Pass Yds" if player.position == "QB" else "Total Yds",
        primary_stat_value="4,150" if player.position == "QB" else "1,350"
    )

    return player_data
