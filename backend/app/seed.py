import sys
import os
import json
import urllib.request
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.db import SessionLocal, engine, Base
from app import models
from app.models import User, Player, Holding, Transaction

Base.metadata.create_all(bind=engine)

SLEEPER_PLAYERS_URL = "https://api.sleeper.app/v1/players/nfl"
ALLOWED_POSITIONS = {"QB", "RB", "WR", "TE"}


def fetch_sleeper_players():
    """Fetches full NFL player dataset from Sleeper API and filters for active QBs, RBs, WRs, and TEs."""
    print("Fetching full player catalog from Sleeper API...")
    req = urllib.request.Request(
        SLEEPER_PLAYERS_URL, 
        headers={"User-Agent": "Cover0-App/1.0"}
    )
    
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
    
    players = []
    for player_id, p in data.items():
        position = p.get("position")
        team = p.get("team")
        first_name = p.get("first_name", "")
        last_name = p.get("last_name", "")
        status = p.get("status")

        if (
            position in ALLOWED_POSITIONS
            and team
            and status == "Active"
            and first_name
            and last_name
        ):
            players.append({
                "external_id": str(player_id),
                "name": f"{first_name} {last_name}",
                "position": position,
                "team": team,
            })
    
    print(f"Found {len(players)} active skill position players from Sleeper.")
    return players


def seed_database():
    db = SessionLocal()
    try:
        # =========================================================================
        # 1. LEGACY CLEANUP & STATE RESET
        # =========================================================================
        legacy_player_ids = [
            p.id for p in db.query(Player.id).filter(Player.external_id.like("sleeper_%")).all()
        ]

        if legacy_player_ids:
            print(f"Cleaning up {len(legacy_player_ids)} legacy mock players & associated holdings/transactions...")
            # Bulk delete dependent records directly to avoid ORM foreign key nullification
            db.query(Transaction).filter(Transaction.player_id.in_(legacy_player_ids)).delete(synchronize_session=False)
            db.query(Holding).filter(Holding.player_id.in_(legacy_player_ids)).delete(synchronize_session=False)
            db.query(Player).filter(Player.id.in_(legacy_player_ids)).delete(synchronize_session=False)
            db.commit()
            print("Legacy cleanup complete.")

        # Reset demo trader user
        demo_user = db.query(User).filter(User.username == "demo_trader").first()
        if not demo_user:
            demo_user = User(
                username="demo_trader",
                email="demo@cover0.app",
                cash_balance=Decimal("100000000.00")
            )
            db.add(demo_user)
            print("Created demo_trader user.")
        else:
            demo_user.cash_balance = Decimal("100000000.00")
            print("Reset demo_trader cash balance to $100M.")
        
        db.commit()

        # =========================================================================
        # 2. SYNC REAL SLEEPER PLAYERS
        # =========================================================================
        sleeper_players = fetch_sleeper_players()
        added_count = 0
        updated_count = 0

        for p in sleeper_players:
            existing = db.query(Player).filter(Player.external_id == p["external_id"]).first()
            if not existing:
                player = Player(
                    external_id=p["external_id"],
                    name=p["name"],
                    position=p["position"],
                    team=p["team"],
                    current_price=Decimal("10000000.00"),
                    total_shares_outstanding=Decimal("0.00")
                )
                db.add(player)
                added_count += 1
            else:
                existing.name = p["name"]
                existing.position = p["position"]
                existing.team = p["team"]
                updated_count += 1

        db.commit()
        print(f"Sync complete: {added_count} new players added, {updated_count} updated.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()