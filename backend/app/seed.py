import sys
import os
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.db import SessionLocal
from app import models

def seed_data():
    db = SessionLocal()
    try:
        # 1. Create Test User if not existing
        user = db.query(models.User).filter_by(username="demo_trader").first()
        if not user:
            user = models.User(
                username="demo_trader",
                email="demo@cover0.app",
                cash_balance=Decimal("100000000.00")
            )
            db.add(user)
            print("Created demo user: demo_trader ($100M)")

        # 2. Create Sample NFL Players
        players_data = [
            {"external_id": "sleeper_1", "name": "Patrick Mahomes", "position": "QB", "team": "KC"},
            {"external_id": "sleeper_2", "name": "Lamar Jackson", "position": "QB", "team": "BAL"},
            {"external_id": "sleeper_3", "name": "Bijan Robinson", "position": "RB", "team": "ATL"},
            {"external_id": "sleeper_4", "name": "Ja'Marr Chase", "position": "WR", "team": "CIN"},
        ]

        for p in players_data:
            existing = db.query(models.Player).filter_by(external_id=p["external_id"]).first()
            if not existing:
                player = models.Player(
                    external_id=p["external_id"],
                    name=p["name"],
                    position=p["position"],
                    team=p["team"],
                    current_price=Decimal("10000000.00"),
                    total_shares_outstanding=Decimal("0.00")
                )
                db.add(player)
                print(f"Added player: {p['name']} ({p['position']} - {p['team']})")

        db.commit()
        print("Seeding complete!")

    finally:
        db.close()

if __name__ == "__main__":
    seed_data()