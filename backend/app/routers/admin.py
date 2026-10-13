from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.services import scoring, sleeper

router = APIRouter(prefix="/api/v1/admin", tags=["Admin & Scoring"])


@router.post("/snapshot/trigger")
def trigger_snapshot(
    season: Optional[str] = Query(None),
    week: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """Manually locks active portfolios into portfolio_snapshots."""
    state = sleeper.get_nfl_state()
    target_season = season or str(state.get("season", "2026"))
    target_week = week if week is not None else int(state.get("week", 6))

    count = scoring.capture_portfolio_snapshots(db, target_season, target_week)
    return {
        "status": "success",
        "message": f"Portfolio snapshot captured for Season {target_season}, Week {target_week}",
        "records_snapshotted": count,
    }


@router.post("/scores/sync")
def sync_scores(
    season: Optional[str] = Query(None),
    week: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """Pulls current game stats from Sleeper and calculates user FPTS."""
    state = sleeper.get_nfl_state()
    target_season = season or str(state.get("season", "2026"))
    target_week = week if week is not None else int(state.get("week", 6))

    players_synced = scoring.sync_sleeper_scores_for_week(db, target_season, target_week)
    users_scored = scoring.calculate_user_weekly_scores(db, target_season, target_week)

    return {
        "status": "success",
        "season": target_season,
        "week": target_week,
        "players_synced": players_synced,
        "users_scored": users_scored,
    }
