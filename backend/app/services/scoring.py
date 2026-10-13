from decimal import Decimal

from sqlalchemy.orm import Session

from app import models
from app.services.sleeper import SLEEPER_BASE_URL, _fetch_json


def capture_portfolio_snapshots(db: Session, season: str, week: int) -> int:
    """Freezes all user holdings with active shares into portfolio_snapshots."""
    holdings = (
        db.query(models.Holding)
        .filter(models.Holding.shares_owned > 0)
        .all()
    )
    count = 0

    for h in holdings:
        existing = (
            db.query(models.PortfolioSnapshot)
            .filter(
                models.PortfolioSnapshot.user_id == h.user_id,
                models.PortfolioSnapshot.player_id == h.player_id,
                models.PortfolioSnapshot.season == season,
                models.PortfolioSnapshot.week == week,
            )
            .first()
        )

        if existing:
            existing.shares_owned = h.shares_owned
        else:
            snapshot = models.PortfolioSnapshot(
                user_id=h.user_id,
                player_id=h.player_id,
                season=season,
                week=week,
                shares_owned=h.shares_owned,
            )
            db.add(snapshot)
        count += 1

    db.commit()
    return count


def sync_sleeper_scores_for_week(db: Session, season: str, week: int) -> int:
    """Fetches real PPR fantasy scores from Sleeper and upserts player_weekly_scores."""
    url = f"{SLEEPER_BASE_URL}/stats/nfl/regular/{season}/{week}"
    stats_data = _fetch_json(url)

    if not isinstance(stats_data, dict):
        return 0

    players = db.query(models.Player).all()
    count = 0

    for p in players:
        p_stat = stats_data.get(p.external_id, {})
        pts_ppr = Decimal(str(p_stat.get("pts_ppr", 0.0) or 0.0))

        score_record = (
            db.query(models.PlayerWeeklyScore)
            .filter(
                models.PlayerWeeklyScore.player_id == p.id,
                models.PlayerWeeklyScore.season == season,
                models.PlayerWeeklyScore.week == week,
            )
            .first()
        )

        if score_record:
            score_record.pts_ppr = pts_ppr
        else:
            score_record = models.PlayerWeeklyScore(
                player_id=p.id,
                season=season,
                week=week,
                pts_ppr=pts_ppr,
            )
            db.add(score_record)
        count += 1

    db.commit()
    return count


def calculate_user_weekly_scores(db: Session, season: str, week: int) -> int:
    """Calculates weekly FPTS using raw shares: sum(shares_owned * pts_ppr)."""
    users = db.query(models.User).all()
    calculated_count = 0

    for user in users:
        snapshots = (
            db.query(models.PortfolioSnapshot)
            .filter(
                models.PortfolioSnapshot.user_id == user.id,
                models.PortfolioSnapshot.season == season,
                models.PortfolioSnapshot.week == week,
            )
            .all()
        )

        total_fpts = Decimal("0.00")
        for snap in snapshots:
            player_score = (
                db.query(models.PlayerWeeklyScore)
                .filter(
                    models.PlayerWeeklyScore.player_id == snap.player_id,
                    models.PlayerWeeklyScore.season == season,
                    models.PlayerWeeklyScore.week == week,
                )
                .first()
            )
            pts = Decimal(str(player_score.pts_ppr)) if player_score else Decimal("0.00")
            total_fpts += Decimal(str(snap.shares_owned)) * pts

        record = (
            db.query(models.UserWeeklyScore)
            .filter(
                models.UserWeeklyScore.user_id == user.id,
                models.UserWeeklyScore.season == season,
                models.UserWeeklyScore.week == week,
            )
            .first()
        )

        if record:
            record.fpts = total_fpts
        else:
            record = models.UserWeeklyScore(
                user_id=user.id,
                season=season,
                week=week,
                fpts=total_fpts,
            )
            db.add(record)
        calculated_count += 1

    db.commit()
    return calculated_count
