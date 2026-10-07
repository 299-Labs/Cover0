from decimal import Decimal
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.db import get_db

router = APIRouter(prefix="/api/v1/leaderboard", tags=["Leaderboard"])


@router.get("", response_model=list[schemas.LeaderboardEntry])
def get_leaderboard(db: Session = Depends(get_db)):
    """Fetch global leaderboard ranked by total NAV (Cash + Holdings Value)."""
    users = db.query(models.User).all()

    entries = []
    for user in users:
        holdings = db.query(models.Holding).filter(models.Holding.user_id == user.id).all()
        holdings_value = Decimal("0.00")

        for h in holdings:
            player = db.query(models.Player).filter(models.Player.id == h.player_id).first()
            if player:
                holdings_value += Decimal(str(h.shares_owned)) * Decimal(str(player.current_price))

        cash = Decimal(str(user.cash_balance))
        total_nav = cash + holdings_value

        entries.append(
            {
                "user_id": user.id,
                "username": user.username,
                "cash_balance": cash,
                "holdings_value": holdings_value,
                "total_nav": total_nav,
            }
        )

    # Sort descending by Total NAV
    entries.sort(key=lambda x: x["total_nav"], reverse=True)

    # Assign ranks
    leaderboard = []
    for rank, entry in enumerate(entries, start=1):
        leaderboard.append(
            schemas.LeaderboardEntry(
                rank=rank,
                user_id=entry["user_id"],
                username=entry["username"],
                cash_balance=entry["cash_balance"],
                holdings_value=entry["holdings_value"],
                total_nav=entry["total_nav"],
            )
        )

    return leaderboard