from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app import models, schemas
from app.db import get_db
from app.services import sleeper

router = APIRouter(prefix="/api/v1/leaderboard", tags=["Leaderboard"])


@router.get("", response_model=list[schemas.LeaderboardEntry])
def get_leaderboard(
    sort_by: str = Query("nav", pattern="^(nav|weekly|season)$"),
    week: Optional[int] = Query(None),
    season: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Fetch global leaderboard with multi-metric sorting (NAV, Weekly FPTS, Season FPTS)."""
    state = sleeper.get_nfl_state()
    current_season = season or str(state.get("season", "2026"))
    current_week = week if week is not None else int(state.get("week", 6))

    users = db.query(models.User).all()
    entries = []

    for user in users:
        # 1. Total NAV
        holdings = db.query(models.Holding).filter(models.Holding.user_id == user.id).all()
        holdings_value = Decimal("0.00")
        for h in holdings:
            player = db.query(models.Player).filter(models.Player.id == h.player_id).first()
            if player:
                holdings_value += Decimal(str(h.shares_owned)) * Decimal(str(player.current_price))

        cash = Decimal(str(user.cash_balance))
        total_nav = cash + holdings_value

        # 2. Current Week FPTS
        weekly_score_rec = (
            db.query(models.UserWeeklyScore)
            .filter(
                models.UserWeeklyScore.user_id == user.id,
                models.UserWeeklyScore.season == current_season,
                models.UserWeeklyScore.week == current_week,
            )
            .first()
        )
        weekly_fpts = Decimal(str(weekly_score_rec.fpts)) if weekly_score_rec else Decimal("0.00")

        # 3. Season-to-Date FPTS
        season_total = (
            db.query(func.coalesce(func.sum(models.UserWeeklyScore.fpts), Decimal("0.00")))
            .filter(
                models.UserWeeklyScore.user_id == user.id,
                models.UserWeeklyScore.season == current_season,
            )
            .scalar()
        )
        season_fpts = Decimal(str(season_total))

        entries.append(
            {
                "user_id": user.id,
                "username": user.username,
                "cash_balance": cash,
                "holdings_value": holdings_value,
                "total_nav": total_nav,
                "weekly_fpts": weekly_fpts,
                "season_fpts": season_fpts,
            }
        )

    # Sort based on selected view
    if sort_by == "weekly":
        entries.sort(key=lambda x: (x["weekly_fpts"], x["total_nav"]), reverse=True)
    elif sort_by == "season":
        entries.sort(key=lambda x: (x["season_fpts"], x["total_nav"]), reverse=True)
    else:
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
                weekly_fpts=entry["weekly_fpts"],
                season_fpts=entry["season_fpts"],
            )
        )

    return leaderboard