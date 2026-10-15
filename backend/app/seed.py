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

SLEEPER_STATE_URL = "https://api.sleeper.app/v1/state/nfl"
SLEEPER_PLAYERS_URL = "https://api.sleeper.app/v1/players/nfl"
ALLOWED_POSITIONS = {"QB", "RB", "WR", "TE"}
MIN_PRICE_FLOOR = Decimal("500000.00")  # $0.5M

RIVAL_TRADERS = [
    {"username": "alpha_quant", "email": "quant@cover0.app", "cash": Decimal("65000000.00")},
    {"username": "gridiron_whale", "email": "whale@cover0.app", "cash": Decimal("40000000.00")},
    {"username": "sleeper_scout", "email": "scout@cover0.app", "cash": Decimal("82000000.00")},
    {"username": "redzone_degen", "email": "degen@cover0.app", "cash": Decimal("25000000.00")},
]


def fetch_sleeper_players():
    """Fetches NFL players and calculates base price from current week projections."""
    # 1. Determine current NFL state (season, season_type, week)
    print("Fetching current NFL state from Sleeper API...")
    try:
        state_req = urllib.request.Request(
            SLEEPER_STATE_URL,
            headers={"User-Agent": "Cover0-App/1.0"},
        )
        with urllib.request.urlopen(state_req, timeout=10) as response:
            state_data = json.loads(response.read().decode())
    except Exception as e:
        print(f"Warning: Failed to fetch NFL state ({e}). Defaulting to 2026 Regular Season, Week 1.")
        state_data = {"season": "2026", "season_type": "regular", "week": 1}

    season = str(state_data.get("season") or "2026")
    season_type = state_data.get("season_type") if state_data.get("season_type") in ("regular", "post") else "regular"
    week = state_data.get("week") or state_data.get("display_week") or 1
    if not isinstance(week, int) or week < 1:
        week = 1

    projections_url = f"https://api.sleeper.app/v1/projections/nfl/{season_type}/{season}/{week}"

    # 2. Fetch full catalog
    print("Fetching full player catalog from Sleeper API...")
    req = urllib.request.Request(
        SLEEPER_PLAYERS_URL,
        headers={"User-Agent": "Cover0-App/1.0"},
    )
    with urllib.request.urlopen(req, timeout=10) as response:
        player_data = json.loads(response.read().decode())

    # 3. Fetch weekly projections
    print(f"Fetching Week {week} projections ({season_type} {season}) from {projections_url}...")
    try:
        req = urllib.request.Request(
            projections_url,
            headers={"User-Agent": "Cover0-App/1.0"},
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            projections_raw = json.loads(response.read().decode())
    except Exception as e:
        print(f"Warning: Failed to fetch projections from {projections_url} ({e}). Using floor pricing.")
        projections_raw = {}

    # Normalize response into dict keyed by player external ID (supports both list and dict shapes)
    if isinstance(projections_raw, list):
        projections_data = {
            str(item.get("player_id")): item
            for item in projections_raw
            if isinstance(item, dict) and item.get("player_id")
        }
    elif isinstance(projections_raw, dict):
        projections_data = {str(k): v for k, v in projections_raw.items()}
    else:
        projections_data = {}

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
            proj = projections_data.get(str(player_id), {})
            proj_fpts = Decimal(str(proj.get("pts_ppr", 0.0) or 0.0))

            # Base price = Weekly Proj FPTS * $1,000,000 floored at $0.5M
            calc_price = proj_fpts * Decimal("1000000.00")
            base_price = max(round(calc_price, 2), MIN_PRICE_FLOOR)

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

        # Zero-share baseline: every spot opens exactly at base_price under the
        # prior-weighted softmax (equal shares -> weights reduce to priors).
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
                existing.base_price = p["base_price"]
                existing.current_price = p["base_price"]
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
                is_onboarded=True,
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

                    # Starter legs run through the real cost function so cash,
                    # averages, and the AMM supply stay consistent.
                    live_players = db.query(Player).all()
                    leg_cost = amm.calculate_buy_cost(str(player.id), live_players, shares)
                    leg_spot = amm.calculate_single_spot_price(str(player.id), live_players)
                    cost = leg_cost

                    # 1. Holding
                    holding = Holding(
                        user_id=user_obj.id,
                        player_id=player.id,
                        shares_owned=shares,
                        avg_buy_price=(cost / shares if shares != Decimal("0") else leg_spot),
                    )
                    db.add(holding)

                    # 2. Transaction history record
                    tx = Transaction(
                        user_id=user_obj.id,
                        player_id=player.id,
                        side="BUY",
                        shares=shares,
                        price_per_share=(cost / shares if shares != Decimal("0") else leg_spot),
                        total_amount=cost,
                        timestamp=now - timedelta(hours=(len(holdings_matrix) - i) * 4),
                    )
                    db.add(tx)

                    # 3. Register shares into AMM supply and refresh this
                    # player's spot (other players are computed on read).
                    player.total_shares_outstanding = Decimal(str(player.total_shares_outstanding)) + shares
                    db.flush()
                    league = db.query(Player).all()
                    player.current_price = amm.calculate_single_spot_price(str(player.id), league)
                    db.flush()

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