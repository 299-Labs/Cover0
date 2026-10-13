import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.db import SessionLocal
from app.services import scoring, sleeper

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def automated_snapshot_job():
    """Runs automatically 5 minutes before Thursday Night Football."""
    logger.info("Running automated weekly portfolio snapshot...")
    db = SessionLocal()
    try:
        state = sleeper.get_nfl_state()
        season = str(state.get("season", "2026"))
        week = int(state.get("week", 6))

        count = scoring.capture_portfolio_snapshots(db, season, week)
        logger.info(
            f"Snapshot complete. {count} portfolios frozen for Season {season}, Week {week}."
        )
    except Exception as e:
        logger.error(f"Error in automated snapshot job: {e}")
    finally:
        db.close()


def automated_scoring_sync_job():
    """Runs automatically to fetch Sleeper stats and update user FPTS."""
    logger.info("Running automated scoring sync...")
    db = SessionLocal()
    try:
        state = sleeper.get_nfl_state()
        season = str(state.get("season", "2026"))
        week = int(state.get("week", 6))

        players_synced = scoring.sync_sleeper_scores_for_week(db, season, week)
        users_scored = scoring.calculate_user_weekly_scores(db, season, week)
        logger.info(
            f"Scoring complete. Synced {players_synced} players and updated {users_scored} users."
        )
    except Exception as e:
        logger.error(f"Error in automated scoring job: {e}")
    finally:
        db.close()


# Initialize the Async Scheduler
scheduler = AsyncIOScheduler()


def start_scheduler():
    """Mounts the cron triggers and starts the background loop."""

    # 1. SNAPSHOT: Thursday at 8:10 PM Eastern Time (5 mins before 8:15 PM kickoff)
    scheduler.add_job(
        automated_snapshot_job,
        CronTrigger(day_of_week="thu", hour=20, minute=10, timezone="America/New_York"),
        id="weekly_snapshot_job",
        replace_existing=True,
    )

    # 2. SCORING SYNC: Every hour on Sunday (1 PM to 11 PM) and Monday Night (8 PM to 11 PM)
    # This keeps the leaderboard updating live while games are playing.
    scheduler.add_job(
        automated_scoring_sync_job,
        CronTrigger(day_of_week="sun", hour="13-23", minute=0, timezone="America/New_York"),
        id="sunday_scoring_sync",
        replace_existing=True,
    )
    scheduler.add_job(
        automated_scoring_sync_job,
        CronTrigger(day_of_week="mon", hour="20-23", minute=0, timezone="America/New_York"),
        id="monday_scoring_sync",
        replace_existing=True,
    )
    # Final weekly true-up on Tuesday morning at 6 AM ET (after stat corrections)
    scheduler.add_job(
        automated_scoring_sync_job,
        CronTrigger(day_of_week="tue", hour=6, minute=0, timezone="America/New_York"),
        id="tuesday_final_sync",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("Background scheduler successfully started.")


def stop_scheduler():
    scheduler.shutdown()
    logger.info("Background scheduler shut down.")
