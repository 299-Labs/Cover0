import secrets
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models, schemas
from app.db import get_db
from app.services import sleeper

router = APIRouter(prefix="/api/v1/leagues", tags=["Leagues"])

INVITE_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


def _generate_unique_invite_code(db: Session, length: int = 6) -> str:
    """Generate an uppercase alphanumeric invite code avoiding ambiguous characters."""
    for _ in range(10):
        code = "".join(secrets.choice(INVITE_CODE_ALPHABET) for _ in range(length))
        exists = db.query(models.League).filter(models.League.invite_code == code).first()
        if not exists:
            return code
    raise HTTPException(status_code=500, detail="Unable to generate unique invite code")


@router.post("", response_model=schemas.LeagueResponse, status_code=status.HTTP_201_CREATED)
def create_league(req: schemas.LeagueCreateRequest, db: Session = Depends(get_db)):
    """Create a new private league and automatically add the creator as member #1."""
    user = db.query(models.User).filter(models.User.id == req.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    invite_code = _generate_unique_invite_code(db)
    league = models.League(
        name=req.name.strip(),
        invite_code=invite_code,
        created_by=user.id,
    )
    db.add(league)
    db.flush()

    # Creator joins automatically
    member = models.LeagueMember(league_id=league.id, user_id=user.id)
    db.add(member)
    db.commit()
    db.refresh(league)

    return schemas.LeagueResponse(
        id=league.id,
        name=league.name,
        invite_code=league.invite_code,
        created_by=league.created_by,
        member_count=1,
        created_at=league.created_at,
    )


@router.post("/join", response_model=schemas.LeagueResponse, status_code=status.HTTP_200_OK)
def join_league(req: schemas.LeagueJoinRequest, db: Session = Depends(get_db)):
    """Join a private league using its unique invite code."""
    user = db.query(models.User).filter(models.User.id == req.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    code = req.invite_code.strip().upper()
    league = db.query(models.League).filter(models.League.invite_code == code).first()
    if not league:
        raise HTTPException(status_code=404, detail="Invalid invite code. League not found.")

    existing_member = (
        db.query(models.LeagueMember)
        .filter(
            models.LeagueMember.league_id == league.id,
            models.LeagueMember.user_id == user.id,
        )
        .first()
    )
    if existing_member:
        raise HTTPException(status_code=400, detail="You are already a member of this league")

    new_member = models.LeagueMember(league_id=league.id, user_id=user.id)
    db.add(new_member)
    db.commit()

    member_count = (
        db.query(func.count(models.LeagueMember.id))
        .filter(models.LeagueMember.league_id == league.id)
        .scalar()
        or 1
    )

    return schemas.LeagueResponse(
        id=league.id,
        name=league.name,
        invite_code=league.invite_code,
        created_by=league.created_by,
        member_count=member_count,
        created_at=league.created_at,
    )


@router.get("/user/{user_id}", response_model=list[schemas.LeagueResponse])
def get_user_leagues(user_id: UUID, db: Session = Depends(get_db)):
    """Return all private leagues the user belongs to with live member counts."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    leagues = (
        db.query(models.League)
        .join(models.LeagueMember, models.LeagueMember.league_id == models.League.id)
        .filter(models.LeagueMember.user_id == user_id)
        .order_by(models.League.created_at.desc())
        .all()
    )

    result = []
    for league in leagues:
        member_count = (
            db.query(func.count(models.LeagueMember.id))
            .filter(models.LeagueMember.league_id == league.id)
            .scalar()
            or 0
        )
        result.append(
            schemas.LeagueResponse(
                id=league.id,
                name=league.name,
                invite_code=league.invite_code,
                created_by=league.created_by,
                member_count=member_count,
                created_at=league.created_at,
            )
        )

    return result


@router.get("/{league_id}/leaderboard", response_model=list[schemas.LeaderboardEntry])
def get_league_leaderboard(
    league_id: UUID,
    sort_by: str = Query("nav", pattern="^(nav|weekly|season)$"),
    week: Optional[int] = Query(None),
    season: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Fetch scoped standings for members of a specific private league."""
    league = db.query(models.League).filter(models.League.id == league_id).first()
    if not league:
        raise HTTPException(status_code=404, detail="League not found")

    state = sleeper.get_nfl_state()
    current_season = season or str(state.get("season", "2026"))
    current_week = week if week is not None else int(state.get("week", 6))

    # Scope users to league members
    members = (
        db.query(models.User)
        .join(models.LeagueMember, models.LeagueMember.user_id == models.User.id)
        .filter(models.LeagueMember.league_id == league_id)
        .all()
    )

    entries = []
    for user in members:
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

    # Sort based on selected metric
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
