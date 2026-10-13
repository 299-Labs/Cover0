import sys
import os
import json
import urllib.request
from datetime import datetime, timezone, timedelta
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
from app.services import amm

Base.metadata.create_all(bind=engine)

SLEEPER_PLAYERS_URL = "https://api.sleeper.app/v1/players/nfl"
SLEEPER_PROJECTIONS_URL = "https://api.sleeper.app/v1/projections/nfl/regular/2026"
ALLOWED_POSITIONS = {"QB", "RB", "WR", "TE"}
MIN_PRICE_FLOOR = Decimal("500000.00")  # $0.5M

RIVAL_TRADERS = [
    {"username": "alpha_quant", "email": "quant@cover0.app", "cash": Decimal("65000000.00")},
    {"username": "gridiron_whale", "email": "whale@cover0.app", "cash": Decimal("40000000.00")},
    {"username": "sleeper_scout", "email": "scout@cover0.app", "cash": Decimal("82000000.00")},
    {"username": "redzone_degen", "email": "degen@cover0.app", "cash": Decimal("25000000.00")},
]


def fetch_sleeper_players():
    """Fetches NFL players and calculates base price from season projections."""
    print("Fetching full player catalog from Sleeper API...")
    req = urllib.request.Request(
        SLEEPER_PLAYERS_URL,
        headers={"User-Agent": "Cover0-App/1.0"}
    )
    with urllib.request.urlopen(req, timeout=10) as response:
        player_data = json.loads(response.read().decode())

    print("Fetching Season Projections from Sleeper API...")
    req = urllib.request.Request(
        SLEEPER_PROJECTIONS_URL,
        headers={"User-Agent": "Cover0-App/1.0"}
    )
    with urllib.request.urlopen(req, timeout=10) as response:
        projections_data = json.loads(response.read().decode())

    players = []
    for player_id, p in player_data.items():
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
            proj = projections_data.get(player_id, {})
            proj_fpts = Decimal(str(proj.get("pts_ppr", 0.0) or 0.0))

            # Base price = (Proj / 17) * $1,000,000 floored at $0.5M
            calc_price = (proj_fpts / Decimal("17.0")) * Decimal("1000000.00")
            base_price = max(calc_price, MIN_PRICE_FLOOR)

            players.append({
                "external_id": str(player_id),
                "name": f"{first_name} {last_name}",
                "position": position,
                "team": team,
                "base_price": base_price,
            })

    print(f"Found {len(players)} active skill position players from Sleeper.")
    return players


def seed_database():
    db = SessionLocal()
    try:
        # =========================================================================
        # 1. SYNC PLAYERS
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
                    base_price=p["base_price"],
                    current_price=p["base_price"],
                    total_shares_outstanding=Decimal("0.00"),
                )
                db.add(player)
                added_count += 1
            else:
                existing.name = p["name"]
                existing.position = p["position"]
                existing.team = p["team"]

                # =====================================================================
                # [OPTIONAL / ONE-TIME RUN] CALIBRATE PRICES TO PROJECTIONS
                # Comment this block out once your baseline prices are established.
                # After commenting out, prices will only move via trading in the AMM.
                # ---------------------------------------------------------------------
                existing.base_price = p["base_price"]
                current_shares = Decimal(str(existing.total_shares_outstanding or 0))
                existing.current_price = amm.calculate_spot_price(
                    base_price=p["base_price"],
                    current_shares=current_shares,
                )
                # ---------------------------------------------------------------------
                # =====================================================================

                updated_count += 1

        db.commit()
        print(f"Players synced: {added_count} added, {updated_count} updated.")

        # =========================================================================
        # 2. SEED USERS (PERSISTENT — NEVER WIPES CASH OR ACCOUNTS)
        # =========================================================================
        demo_user = db.query(User).filter(User.username == "demo_trader").first()
        if not demo_user:
            demo_user = User(
                username="demo_trader",
                email="demo@cover0.app",
                cash_balance=Decimal("100000000.00"),
            )
            db.add(demo_user)
            print("Created demo_trader user.")

        rival_objs = []
        for r in RIVAL_TRADERS:
            u = db.query(User).filter(User.username == r["username"]).first()
            if not u:
                u = User(username=r["username"], email=r["email"], cash_balance=r["cash"])
                db.add(u)
                print(f"Created rival user {r['username']}.")
            rival_objs.append(u)

        db.commit()
        db.refresh(demo_user)
        for u in rival_objs:
            db.refresh(u)

        # =========================================================================
        # 3. SEED STARTER HOLDINGS & TRANSACTIONS (RUNS ONLY IF DB IS EMPTY)
        # =========================================================================
        all_user_ids = [demo_user.id] + [u.id for u in rival_objs]
        existing_holdings_count = (
            db.query(Holding)
            .filter(Holding.user_id.in_(all_user_ids))
            .count()
        )

        if existing_holdings_count > 0:
            print("Portfolios and trade histories already exist. Preserving existing positions and prices.")
        else:
            available_players = db.query(Player).limit(10).all()
            if len(available_players) >= 5:
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

                now = datetime.now(timezone.utc)

                for i, (user_obj, p_idx, shares) in enumerate(holdings_matrix):
                    player = available_players[p_idx]
                    cost = shares * player.current_price

                    # 1. Holding
                    holding = Holding(
                        user_id=user_obj.id,
                        player_id=player.id,
                        shares_owned=shares,
                        avg_buy_price=player.current_price,
                    )
                    db.add(holding)

                    # 2. Transaction history record
                    tx = Transaction(
                        user_id=user_obj.id,
                        player_id=player.id,
                        side="BUY",
                        shares=shares,
                        price_per_share=player.current_price,
                        total_amount=cost,
                        timestamp=now - timedelta(hours=(len(holdings_matrix) - i) * 4),
                    )
                    db.add(tx)

                    # 3. Register shares into AMM supply and advance spot price
                    new_supply = Decimal(str(player.total_shares_outstanding)) + shares
                    player.total_shares_outstanding = new_supply
                    player.current_price = amm.calculate_spot_price(player.base_price, new_supply)

                db.commit()
                print("Successfully assigned initial starter portfolios, transactions, and calibrated AMM supply.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()