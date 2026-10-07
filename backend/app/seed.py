import sys
import os
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.db import SessionLocal, engine, Base
from app import models
from app.models import User, Player

Base.metadata.create_all(bind=engine)

SEED_PLAYERS = [
    # QBs
    {"external_id": "sleeper_1", "name": "Patrick Mahomes", "position": "QB", "team": "KC"},
    {"external_id": "sleeper_2", "name": "Lamar Jackson", "position": "QB", "team": "BAL"},
    {"external_id": "sleeper_3", "name": "Josh Allen", "position": "QB", "team": "BUF"},
    {"external_id": "sleeper_4", "name": "C.J. Stroud", "position": "QB", "team": "HOU"},
    # RBs
    {"external_id": "sleeper_5", "name": "Bijan Robinson", "position": "RB", "team": "ATL"},
    {"external_id": "sleeper_6", "name": "Breece Hall", "position": "RB", "team": "NYJ"},
    {"external_id": "sleeper_7", "name": "Saquon Barkley", "position": "RB", "team": "PHI"},
    {"external_id": "sleeper_8", "name": "Christian McCaffrey", "position": "RB", "team": "SF"},
    # WRs
    {"external_id": "sleeper_9", "name": "Ja'Marr Chase", "position": "WR", "team": "CIN"},
    {"external_id": "sleeper_10", "name": "Justin Jefferson", "position": "WR", "team": "MIN"},
    {"external_id": "sleeper_11", "name": "CeeDee Lamb", "position": "WR", "team": "DAL"},
    {"external_id": "sleeper_12", "name": "Amon-Ra St. Brown", "position": "WR", "team": "DET"},
    # TEs
    {"external_id": "sleeper_13", "name": "Travis Kelce", "position": "TE", "team": "KC"},
    {"external_id": "sleeper_14", "name": "Sam LaPorta", "position": "TE", "team": "DET"},
    {"external_id": "sleeper_15", "name": "Trey McBride", "position": "TE", "team": "ARI"},
    {"external_id": "sleeper_16", "name": "Brock Bowers", "position": "TE", "team": "LV"},
]


def seed_data():
    """Seed demo user + 16 top NFL players. Idempotent via external_id."""
    return seed_database()


def seed_database():
    db = SessionLocal()
    try:
        # Seed Demo User
        demo_user = db.query(User).filter(User.username == "demo_trader").first()
        if not demo_user:
            demo_user = User(
                username="demo_trader",
                email="demo@cover0.app",
                cash_balance=Decimal("100000000.00")
            )
            db.add(demo_user)
            print("Created demo_trader user.")

        # Seed Players (idempotent via external_id)
        players_added = 0
        for p in SEED_PLAYERS:
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
                players_added += 1
            else:
                # Keep legacy seed names in sync if they already exist
                # (e.g. sleeper_3 was Bijan Robinson in the old 4-player seed,
                #  now Josh Allen — update to canonical 16-player list).
                updated = False
                for field in ("name", "position", "team"):
                    if getattr(existing, field) != p[field]:
                        setattr(existing, field, p[field])
                        updated = True
                if updated:
                    print(f"Updated player {p['external_id']}: {p['name']} ({p['position']} - {p['team']})")

        db.commit()
        print(f"Seeding complete: {players_added} new players added.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
