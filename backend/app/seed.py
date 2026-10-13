import sys
import os
import json
import urllib.request
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.db import SessionLocal, engine, Base
from app import models
from app.models import (
    User,
    Player,
    Holding,
    Transaction,
    PortfolioSnapshot,
    PlayerWeeklyScore,
    UserWeeklyScore,
)

Base.metadata.create_all(bind=engine)

SLEEPER_PLAYERS_URL = "https://api.sleeper.app/v1/players/nfl"
ALLOWED_POSITIONS = {"QB", "RB", "WR", "TE"}

RIVAL_TRADERS = [
    {"username": "alpha_quant", "email": "quant@cover0.app", "cash": Decimal("65000000.00")},
    {"username": "gridiron_whale", "email": "whale@cover0.app", "cash": Decimal("40000000.00")},
    {"username": "sleeper_scout", "email": "scout@cover0.app", "cash": Decimal("82000000.00")},
    {"username": "redzone_degen", "email": "degen@cover0.app", "cash": Decimal("25000000.00")},
]


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
            db.query(PortfolioSnapshot).filter(PortfolioSnapshot.player_id.in_(legacy_player_ids)).delete(synchronize_session=False)
            db.query(PlayerWeeklyScore).filter(PlayerWeeklyScore.player_id.in_(legacy_player_ids)).delete(synchronize_session=False)
            db.query(Player).filter(Player.id.in_(legacy_player_ids)).delete(synchronize_session=False)
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
                    total_shares_outstanding=Decimal("0.00"),
                )
                db.add(player)
                added_count += 1
            else:
                existing.name = p["name"]
                existing.position = p["position"]
                existing.team = p["team"]
                updated_count += 1

        db.commit()
        print(f"Players synced: {added_count} added, {updated_count} updated.")

        # =========================================================================
        # 3. SEED USERS (DEMO TRADER + RIVALS)
        # =========================================================================
        demo_user = db.query(User).filter(User.username == "demo_trader").first()
        if not demo_user:
            demo_user = User(
                username="demo_trader",
                email="demo@cover0.app",
                cash_balance=Decimal("100000000.00"),
            )
            db.add(demo_user)
        else:
            demo_user.cash_balance = Decimal("100000000.00")

        rival_objs = []
        for r in RIVAL_TRADERS:
            u = db.query(User).filter(User.username == r["username"]).first()
            if not u:
                u = User(username=r["username"], email=r["email"], cash_balance=r["cash"])
                db.add(u)
            else:
                u.cash_balance = r["cash"]
            rival_objs.append(u)

        db.commit()
        db.refresh(demo_user)
        for u in rival_objs:
            db.refresh(u)

        # =========================================================================
        # 4. SEED INITIAL HOLDINGS FOR DIVERSE LEADERBOARD
        # =========================================================================
        available_players = db.query(Player).limit(10).all()
        if len(available_players) >= 5:
            all_user_ids = [demo_user.id] + [u.id for u in rival_objs]
            db.query(Holding).filter(Holding.user_id.in_(all_user_ids)).delete(synchronize_session=False)

            holdings_matrix = [
                (demo_user, 0, Decimal("3.0")),
                (demo_user, 1, Decimal("2.0")),
                (rival_objs[0], 1, Decimal("4.0")),
                (rival_objs[0], 2, Decimal("3.0")),
                (rival_objs[1], 0, Decimal("6.0")),
                (rival_objs[1], 3, Decimal("2.5")),
                (rival_objs[2], 2, Decimal("2.0")),
                (rival_objs[2], 4, Decimal("4.0")),
                (rival_objs[3], 3, Decimal("5.0")),
                (rival_objs[3], 4, Decimal("3.5")),
            ]

            for user_obj, p_idx, shares in holdings_matrix:
                player = available_players[p_idx]
                holding = Holding(
                    user_id=user_obj.id,
                    player_id=player.id,
                    shares_owned=shares,
                    avg_buy_price=player.current_price,
                )
                db.add(holding)

            db.commit()
            print("Successfully assigned starter portfolios to demo trader and rivals.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()