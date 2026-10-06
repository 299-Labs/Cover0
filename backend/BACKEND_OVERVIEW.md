# Cover0 Backend — LLM Context Overview

> Fantasy football share-trading app where users BUY/SELL fractional shares of NFL players. Prices react via a linear bonding-curve AMM (no order book).

## 1. Tech Stack
- **Framework:** FastAPI 0.142.2 (`backend/app/main.py` — title `Cover0 API`, version `0.1.0`)
- **ORM:** SQLAlchemy 2.1.3 (DeclarativeBase in `app/db.py`)
- **DB:** PostgreSQL 16 (docker-compose `cover0_postgres`, host port `5433->5432`, db `cover0`). `DATABASE_URL` defaults to `postgresql://postgres:postgres@localhost:5433/cover0`
- **Migrations:** Alembic 1.20.0 (`backend/alembic/`, `alembic.ini`)
- **Validation:** Pydantic 2.13.5
- **Server:** Uvicorn 0.54.0, CORS open to `http://localhost:3000` (Next.js frontend) via `ALLOWED_ORIGINS` env
- **Extras installed but unused:** `celery`, `redis`, `amqp/kombu/billiard` — no worker code yet. `psycopg` + `psycopg2-binary` both present.
- **Tests:** pytest 9.1.1 (`backend/tests/test_amm.py`)

## 2. Folder Structure
```
backend/
  requirements.txt
  alembic.ini
  alembic/
    env.py
    script.py.mako
    versions/          # empty — no migrations yet
  app/
    main.py            # FastAPI app + CORS + router includes + GET /health
    db.py              # engine, SessionLocal, Base, get_db() dependency
    models.py          # User, Player, Holding, Friendship (SQLAlchemy)
    schemas.py         # TradeRequest/Response, TradePreviewResponse, PlayerResponse, HoldingResponse, PortfolioResponse
    seed.py            # creates demo_trader + 4 NFL players
    routers/
      __init__.py
      market.py        # GET /api/v1/market/players, GET /api/v1/market/players/{player_id}
      trade.py         # POST /api/v1/trade/execute
      portfolio.py     # GET /api/v1/portfolio/{user_id}
      users.py         # GET /api/v1/users/demo
    services/
      __init__.py
      amm.py           # bonding-curve math: BASE_PRICE, K_SENSITIVITY, spot/buy/sell funcs
  tests/
    test_amm.py        # 6 unit tests for AMM math
```

## 3. Data Models (`app/models.py`)
All PKs are `UUID(as_uuid=True), default=uuid.uuid4`.

- **User (`users`):** `id, username[unique 50], email[unique 255], cash_balance[Numeric(14,2) default 100000000.00 = $100M], created_at`. Has `holdings -> Holding cascade delete-orphan`.
- **Player (`players`):** `id, external_id[unique 100 e.g. sleeper_1], name[100], position[10 e.g. QB/RB/WR], team[10 e.g. KC], current_price[Numeric(12,2) default 10000000.00 = $10M], total_shares_outstanding[Numeric(14,4) default 1000.00], created_at`. Has `holdings`.
- **Holding (`holdings`):** `id, user_id[FK users.id CASCADE], player_id[FK players.id CASCADE], shares_owned[Numeric(12,4) default 0], avg_buy_price[Numeric(12,2) default 0], updated_at`. Constraint `UniqueConstraint(user_id, player_id, name=unique_user_player)`.
- **Friendship (`friendships`):** `id, user_id[FK users.id], friend_id[FK users.id], created_at`. Constraints `unique_friendship(user_id,friend_id)`, `no_self_friend(user_id != friend_id)`. **Currently unused — no router touches it.**

Money uses `Numeric/Decimal` everywhere — never float.

## 4. Core Market Mechanism (`app/services/amm.py`)
Linear bonding curve, per-player global supply `s = total_shares_outstanding`:

- `BASE_PRICE = Decimal("10000000.00")` ($10M)
- `K_SENSITIVITY = Decimal("5000.00")` ($5k per share)
- `calculate_spot_price(net_shares, perf_modifier=0)`: `P(s) = P0 + k*s + perf_modifier`
- `calculate_buy_cost(current_shares, buy_shares, perf_modifier=0)`: trapezoid integral `DeltaS * (P(S1)+P(S2))/2` where `S1=current, S2=current+buy`. Raises if `buy_shares <= 0`.
- `calculate_sell_return(current_shares, sell_shares, perf_modifier=0)`: integral from `S-DeltaS` to `S`. Raises if `<=0` or `sell > current`.
- Property: buy-then-sell same N is symmetric (zero spread) — verified in tests. `perf_modifier` param exists but **never passed** (always 0) — hook for future real-world performance adjustment.

Example: `s=0, buy 10` => `p0=10M, p10=10.05M, cost=10*(10M+10.05M)/2=100.25M` — exceeds default $100M balance, so large buys fail.

## 5. API Endpoints (`app/main.py` + `routers/`)

Base prefix `/api/v1`. No auth — `user_id` passed in body/path.

- `GET /health` -> `{status:ok, app:Cover0 Backend}`
- `GET /api/v1/market/players` -> `List[PlayerResponse]` (all players)
- `GET /api/v1/market/players/{player_id:UUID}` -> `PlayerResponse` or 404
- `POST /api/v1/trade/execute` body `TradeRequest{user_id:UUID, player_id:UUID, side:BUY|SELL (regex validated), shares:Decimal>0}` -> `TradeResponse{transaction_id:UUID (random uuid4, not persisted), user_id, player_id, side, shares, execution_price:Decimal (= new spot price AFTER trade), total_amount:Decimal (=cost/proceeds), new_cash_balance, timestamp (=player.created_at — BUG, should be now)}`
  Logic (`routers/trade.py`):
  1. `SELECT ... FOR UPDATE` user + player (race protection).
  2. BUY: `cost=amm.calculate_buy_cost(supply, shares)`, 400 if `cash < cost`. `cash-=cost`, `supply+=shares`, create/update Holding with weighted `avg_buy_price=(old_shares*old_avg+cost)/new_total`.
  3. SELL: 400 if no holding or `owned < shares`. `proceeds=amm.calculate_sell_return(supply, shares)`, `cash+=proceeds`, `supply-=shares`, decrement holding, delete if 0.
  4. `player.current_price=amm.calculate_spot_price(new_supply)`, `db.commit()`.
  5. No `TradePreviewResponse` endpoint yet — schema defined but unused. No transaction ledger table.
- `GET /api/v1/portfolio/{user_id:UUID}` -> `PortfolioResponse{user_id, username, cash_balance, total_holdings_value, total_nav=cash+holdings, holdings:List[HoldingResponse]}`, each `HoldingResponse{player_id, player_name, position, shares_owned, avg_buy_price, current_price, market_value=shares*current, unrealized_pnl=(current-avg)*shares}`. N+1 query per holding.
- `GET /api/v1/users/demo` -> `{id, username, email, cash_balance}` for `demo_trader` or 404 with hint `Did you run 'python app/seed.py'?`

## 6. Schemas (`app/schemas.py`)
- `TradeRequest`, `TradeResponse`, `TradePreviewResponse{player_id, side, shares, current_price, total_amount, execution_price, new_price, price_impact_percent}` (unused), `PlayerResponse{id, external_id, name, position, team, current_price, total_shares_outstanding, from_attributes=True}`, `HoldingResponse`, `PortfolioResponse`.

## 7. DB & Seed
- `app/db.py`: `create_engine(DATABASE_URL)`, `SessionLocal(autocommit=False, autoflush=False)`, `get_db()` yields session for `Depends`.
- `app/seed.py` (`python app/seed.py`): creates `demo_trader/demo@cover0.app/$100M` if missing + 4 players at `$10M` with `total_shares_outstanding=0.00` (note: differs from model default `1000.00`): Mahomes QB KC (sleeper_1), Lamar QB BAL (sleeper_2), Bijan RB ATL (sleeper_3), Ja'Marr WR CIN (sleeper_4). Idempotent via `external_id` check.
- `docker-compose.yml`: only postgres. No backend/redis service. `.env.example`: `DATABASE_URL`, `REDIS_URL=redis://localhost:6379`, Clerk keys (frontend auth, unused in backend).

## 8. Tests (`tests/test_amm.py`)
Pure-math tests, no DB: base price at 0 shares, +$5k/share (100 shares => $10.5M), buy 1 at 0 => $10,002,500, buy 10 at 0 => $100,250,000, buy/sell symmetry (buy 10 at 50 then sell 10 at 60 equal), invalid inputs raise `ValueError`.

## 9. Key Invariants / Gotchas for LLM
- Supply is global per player (`Player.total_shares_outstanding`), not per-user sum — sells reduce supply, buys increase it, price follows linearly.
- All amounts `Decimal(str(...))` conversions to avoid float errors.
- Trade uses row-level locking but no explicit transaction isolation config; single `db.commit()` at end.
- `TradeResponse.timestamp` is wrong (player creation time); `transaction_id` ephemeral; no persistence of trades.
- `Friendship`, `TradePreviewResponse`, `perf_modifier`, `celery/redis` are dead code / future hooks.
- No auth, no pagination, no price history/candles, no shorting (must own to sell), no fee/slippage beyond curve.
- Starting state: user $100M, player $10M, supply 0 — first buys are expensive (10 shares = entire bankroll).

## 10. Copy-Paste Context Prompt
> Build on Cover0 FastAPI backend: User{cash_balance $100M}, Player{current_price, total_shares_outstanding}, Holding{shares_owned, avg_buy_price unique(user,player)}. AMM: P(s)=10M+5k*s, buy/sell cost = trapezoid integral. Endpoints: GET /health, GET /api/v1/market/players[/{id}], POST /api/v1/trade/execute{user_id,player_id,side:BUY|SELL,shares>0}, GET /api/v1/portfolio/{user_id} returns NAV, GET /api/v1/users/demo. Postgres+SQLAlchemy, Decimal math, FOR UPDATE locking, no auth.