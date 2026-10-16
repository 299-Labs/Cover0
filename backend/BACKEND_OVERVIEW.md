# Cover0 Backend — LLM Context Overview

> Fantasy football share-trading engine: users BUY/SELL fractional shares of NFL players. Prices move on a **league-wide prior-weighted softmax with hard $0.5M floor** — spots computed on read; only the traded player's spot is persisted on execute. Live NFL data from Sleeper API, weekly fantasy scoring pipeline via APScheduler, Supabase-JWT auth for profiles, Resend support desk.

## 1. Tech Stack

- **Framework:** FastAPI `0.142.2` (`backend/app/main.py` — title `Cover0 API`, description `Real-Time Fantasy Sports Market Engine API`, version `0.1.0`). Lifespan starts/stops APScheduler. `Base.metadata.create_all(bind=engine)` runs on import (auto-creates missing tables).
- **ORM:** SQLAlchemy `2.1.3` (DeclarativeBase in `app/db.py`, `SessionLocal(autocommit=False, autoflush=False)`, `get_db()` yields per-request session).
- **DB:** PostgreSQL 16 (`docker-compose.yml` service `cover0_postgres`, host `5433->5432`, db `cover0`). `DATABASE_URL` defaults to `postgresql://postgres:postgres@localhost:5433/cover0`.
- **Migrations:** Alembic `1.20.0` (`backend/alembic/`, `alembic.ini`). Chain: `7bf20648 (core tables)` → `b7c2d8e4 (transactions)` → `03bd1bf0 (players.base_price)` → `4df17988 (users.avatar_url)` → `5e9c1f28 (friendships → leagues/league_members)` → `6a1b2c3d4e5f (users.is_onboarded, head)`.
- **Validation:** Pydantic `2.13.5` + `email-validator` (used by `SupportTicketRequest.user_email: EmailStr`).
- **Server:** Uvicorn `0.54.0`. CORS origins from `ALLOWED_ORIGINS` env (default `http://localhost:3000,http://127.0.0.1:3000`), `allow_credentials=True`.
- **Scheduler:** APScheduler `3.11.3` (`AsyncIOScheduler`, ET cron triggers in `app/services/scheduler.py`).
- **Auth:** PyJWT `2.15.1` — verifies Supabase JWT (`HS256`, `aud=authenticated`) via `SUPABASE_JWT_SECRET`; falls back to unverified decode in dev if unset. Auto-provisions `User` on first sight: email-signup `user_metadata.username` → claimed handle (`is_onboarded=True`, numeric suffix on collision); Google OAuth (no username) → generated `{emailprefix}_{randhex}` handle with `is_onboarded=False` forcing the `OnboardingModal` claim flow.
- **External APIs:** No HTTP client lib — Sleeper + Resend both use stdlib `urllib.request` + `json`. Sleeper responses cached in-memory 30 min (`_cache`/`_cache_ttl` in `services/sleeper.py`).
- **Tests:** pytest `9.1.1` (`pytest.ini`: `pythonpath=.`, `testpaths=tests`). `TestClient` + SQLite `:memory:` + `StaticPool`, per-test seed (`tests/conftest.py`).
- **Installed but unused:** `celery`, `redis`, `kombu`, `billiard`, `amqp` — no worker code. `psycopg` + `psycopg-binary` + `psycopg2-binary` all present.

## 2. Folder Structure

```
backend/
  .env.example            # DATABASE_URL, REDIS_URL (unused), RESEND_API_KEY, SUPABASE_JWT_SECRET
  alembic.ini
  pytest.ini
  requirements.txt
  alembic/
    env.py  script.py.mako  README
    versions/
      7bf2064872a4_create_core_tables.py
      b7c2d8e4f1a3_add_transactions_table.py
      03bd1bf03d1b_add_base_price_and_scoring_tables.py  # adds players.base_price (+ scoring tables per filename)
      4df1798847ac_add_user_auth.py                      # adds users.avatar_url
      5e9c1f28b4a0_replace_friendships_with_leagues.py  # drops friendships; adds leagues + league_members
      6a1b2c3d4e5f_add_users_is_onboarded.py            # adds users.is_onboarded (head)
  app/
    main.py               # app + CORS + lifespan scheduler + 8 router includes + GET /health
    db.py                 # engine, SessionLocal, Base, get_db()
    models.py             # User, Player, Holding, League, LeagueMember, Transaction, PortfolioSnapshot, PlayerWeeklyScore, UserWeeklyScore
    schemas.py            # trade, player-detail, user, holding/portfolio, league, leaderboard, transaction schemas
    auth.py               # get_current_user (Supabase JWT → auto-provision User)
    utils.py              # get_headshot_url(external_id)
    seed.py               # Sleeper sync + demo/rival users + starter portfolios (python app/seed.py)
    routers/
      __init__.py
      market.py           # GET /api/v1/market/players, GET /players/{id} (rich detail)
      trade.py            # POST /preview, POST /execute, GET /history/{user_id}
      portfolio.py        # GET /api/v1/portfolio/{user_id}
      users.py            # GET /check-username (public), GET|PATCH|DELETE /me (Supabase JWT auth)
      leagues.py           # POST / (create, creator auto-joins), POST /join, POST /{id}/leave, GET /user/{user_id}, GET /{league_id}/leaderboard?sort_by=nav|weekly|season&week&season
      leaderboard.py      # GET /?sort_by=nav|weekly|season&week&season
      admin.py            # POST /snapshot/trigger, POST /scores/sync (NO auth)
      support.py          # POST /api/v1/support/contact (Resend)
    services/
      amm.py              # fading prior-weighted softmax + Simpson execution pricing (compute-on-read)
      sleeper.py          # NFL state, bio, stats/projections, schedule map, game logs + past seasons (cached)
      scoring.py          # snapshot freeze + weekly FPTS pipeline
      scheduler.py        # Thursday snapshot + Sun/Mon/Tue scoring crons
  tests/
    conftest.py           # sqlite memory, demo_trader + Mahomes seed (zero-share baseline), get_db override
    test_amm.py           # zero-share baseline, floor, leader pricing, buy/sell symmetry, validation, previews, Simpson-vs-integral
    test_trade.py         # preview/execute/history expectations computed live from the new AMM
    test_api_routes.py    # health, check-username (available/taken/invalid), market list, empty portfolio, DELETE /users/me cascade
    test_leagues.py       # create (+unknown-user 404, name-validation 422s, friends-gone 404s), join/duplicate/bad-code, leave (ownership transfer + disband), user listing, member-scoped leaderboard (outsider excluded, weekly + NAV sorts, unknown-league 404)
    test_no_recalibration.py  # seed-only baselines: no /recalibrate-base-prices route, no Tuesday cron
```

## 3. Data Models (`app/models.py`)

All PKs are `UUID(as_uuid=True), default=uuid.uuid4`. Money/shares are `Numeric/Decimal` everywhere — never float. NOTE: models import `UUID` from `sqlalchemy.dialects.postgresql` (Postgres-only type; the SQLite test harness only works because UUIDs are client-generated and tables are created fresh per test).

- **User (`users`):** `id, username[unique 50], email[unique 255], avatar_url[Text nullable — added by migration 4df17988], cash_balance[Numeric(14,2) default 100000000.00 = $100M], is_onboarded[Boolean default False — added by head migration 6a1b2c3d4e5f; False forces handle-claim flow], created_at[naive utcnow]`. `holdings → Holding cascade delete-orphan`; transactions/snapshots/scores via `backref`.
- **Player (`players`):** `id, external_id[unique 100 — Sleeper numeric id as string], name[100], position[10: QB/RB/WR/TE], team[10], base_price[Numeric(12,2) default 500000.00 = $0.5M — per-player anchor from projections], current_price[Numeric(12,2) default 500000.00], total_shares_outstanding[Numeric(14,4) default 1000.00 — seed always writes 0.00], created_at`. `holdings` cascade.
- **Holding (`holdings`):** `id, user_id[FK CASCADE], player_id[FK CASCADE], shares_owned[Numeric(12,4) default 0], avg_buy_price[Numeric(12,2) default 0], updated_at`. `UniqueConstraint(user_id, player_id)`.
- **League (`leagues`):** `id, name[String(50)], invite_code[String(10) unique + index — 6-char uppercase from ambiguity-free alphabet], created_by[FK users CASCADE], created_at`. `creator → User`, `members → LeagueMember cascade delete-orphan`.
- **LeagueMember (`league_members`):** `id, league_id[FK CASCADE], user_id[FK CASCADE], joined_at`. `unique_league_member(league_id,user_id)`. Symmetric membership that scopes league leaderboards (replaces the old directed `Friendship` edge).
- **Transaction (`transactions` — persistent ledger):** `id, user_id[FK CASCADE], player_id[FK CASCADE], side[String(10) BUY|SELL], shares[Numeric(12,4)], price_per_share[Numeric(12,2) = average execution price], total_amount[Numeric(14,2)], timestamp[tz-aware UTC now]`.
- **PortfolioSnapshot (`portfolio_snapshots` — Thursday freeze for scoring):** `id, user_id[FK CASCADE], player_id[FK CASCADE], season[String(10) e.g. "2026"], week[Numeric(4,0)], shares_owned[Numeric(12,4)], created_at`. `UniqueConstraint(user_id, player_id, season, week)`.
- **PlayerWeeklyScore (`player_weekly_scores`):** `id, player_id[FK CASCADE], season, week[Numeric(4,0)], pts_ppr[Numeric(8,2) default 0], updated_at`. `UniqueConstraint(player_id, season, week)`.
- **UserWeeklyScore (`user_weekly_scores`):** `id, user_id[FK CASCADE], season, week[Numeric(4,0)], fpts[Numeric(10,2) default 0], updated_at`. `UniqueConstraint(user_id, season, week)`.

## 4. Core Market Mechanism (`app/services/amm.py`)

**League-wide prior-weighted softmax with hard floor + Bayesian prior fading.** Prices are coupled: `P_i = floor + V_float · softmax(E_i)` with `E_i = λ(S)·ln(w0_i) + s_i / b(S)`, where `floor = $0.5M`, `V_float = max(Σ base_price − n · floor, ε)`, priors `w0_i = (base_price_i − floor) / V_float` (normalized to sum 1), liquidity depth `b(S) = 150 + 0.03 · S`, and fading `λ(S) = 1 / (1 + S / 5000)` (`S½ = 5000` shares) — all over ALL players' shares. At `S = 0`, `λ = 1` so softmax reduces to priors ⇒ **zero-share baseline: every spot opens exactly at `base_price`**; as `S` grows the prior term fades and pricing trends toward demand share. Execution pricing is **Simpson's 3-point quadrature**: `cost = (Δ/6)·[P(s) + 4·P(s+Δ/2) + P(s+Δ)]` (negated for sells) — identical evaluation points in both directions ⇒ exact buy/sell symmetry, zero path-dependency, and agreement with a 1,000-step numerical integral to under a cent (measured ≈ $0.007 on a $10M order; guarded by `test_simpson_cost_matches_numerical_integral` at $0.05 tolerance). Internals are **float** (`EPSILON_FLOAT = 1e-6`); Decimal only at the API boundary; money rounded to cents. Public API: `batch_compute_spot_prices(players) → {id: Decimal}` (compute-on-read), `calculate_single_spot_price(player_id, players)`, `calculate_buy_cost(player_id, players, shares)`, `calculate_sell_return(player_id, players, shares)`, `calculate_trade_preview(player_id, players, side, shares)` → dict `{current_price, total_amount, execution_price, new_price, price_impact_percent}` — all take ORM rows, lightweight SQLAlchemy `(id, base_price, total_shares_outstanding)` Rows, or `{id, base_price, total_shares_outstanding}` dicts (via `_read_field`, which never mistakes a 0 share count for a missing value). Unknown player ⇒ `ValueError("Player not found…")`. Reads reprice the whole league in memory; execution persists ONLY the traded player's new spot — other players' `current_price` stays stale until read (never trusted for pricing).

## 5. API Endpoints

Base prefix `/api/v1` + `GET /health → {status:ok, app:Cover0 Backend}`. **No auth except `GET|PATCH|DELETE /users/me`** — everything else (including trade execution, leagues, and admin triggers) takes a raw `user_id` in body/path. There is NO `GET /users/demo` endpoint (the doc's old "legacy demo" line was wrong — `demo_trader` exists only as a seed/test row).

- **Market** (`routers/market.py`):
  - `GET /api/v1/market/players → List[PlayerResponse]` (all rows; spots computed on read via `amm.batch_compute_spot_prices`, `headshot_url` injected per row via `get_headshot_url`).
  - `GET /api/v1/market/players/{player_id} → PlayerDetailResponse` — heaviest endpoint: (1) Sleeper bio + season-actual / weekly-proj / season-proj + historical logs, each fail-soft to `{}` on exception; (2) platform market-cap ownership (`player mcap / total mcap × 100`, distinct holders count); (3) 4 ranks over ALL players (`fpts_rank` by Sleeper actual PPR, `ownership_rank` by mcap, `value_rank` = actual/price, `proj_value_rank` = proj/price — falls back to price-as-fpts when Sleeper returns no actuals); (4) price history from `transactions.price_per_share` ascending + current spot appended (first point seeds from first tx or current); (5) hardcoded `stats` card (`games_played=17`, QB `268.4 pts / 28 TDs / 4,150 Pass Yds`, else `210.0 / 10 / 1,350`, `last_game=24.2`). `bio/ownership/rankings` optional, history defaults `[]`.
- **Trade** (`routers/trade.py`):
  - `POST /api/v1/trade/preview → TradePreviewResponse{player_id, side, shares, current_price, total_amount, execution_price, new_price, price_impact_percent}`. Loads all players and prices via `amm.calculate_trade_preview` (read-only, no locks); 404 unknown player; 400 on AMM `ValueError` (non-positive shares, oversell vs global supply, bad side).
  - `POST /api/v1/trade/execute → TradeResponse{transaction_id (= persisted Transaction.id), user_id, player_id, side, shares, execution_price (= average), total_amount, new_cash_balance, timestamp (= tx time)}`. Locks user + traded player only (`with_for_update`); the rest of the book is read lock-free as a lightweight `(id, base_price, total_shares_outstanding)` column snapshot. BUY: 400 `Insufficient cash balance`, weighted `avg_buy_price`. SELL: 400 `Insufficient shares owned`, holding row deleted at 0. Persists ONLY the traded player's recomputed spot, inserts `Transaction`, single `commit()`; `ValueError` → rollback + 400.
  - `GET /api/v1/trade/history/{user_id} → List[TransactionResponse]` newest-first with `player_name/position/external_id/headshot_url`.

- **Portfolio** (`routers/portfolio.py`): `GET /api/v1/portfolio/{user_id}` returns NAV plus per-holding market value and unrealized PnL. 404 on unknown user. Loads all players ONCE for live spot prices (no N+1): holding current price and NAV market value come from `amm.batch_compute_spot_prices` over the whole book.
- **Users** (`routers/users.py`): public `GET /api/v1/users/check-username?username=` (regex `^[a-zA-Z0-9_]{3,20}$`, case-insensitive uniqueness; `{available, message}`); authed `GET /api/v1/users/me` (Supabase JWT → auto-provision) and `PATCH /api/v1/users/me` (username 3–20 same regex + case-insensitive uniqueness → sets `is_onboarded=True`; `avatar_url` passthrough); authed `DELETE /api/v1/users/me` (deletes `public.users` row → Postgres `ON DELETE CASCADE` wipes holdings/transactions/league rows, then best-effort `auth.users` cleanup in a savepoint; `{status:ok}`). Router-local `UpdateProfileRequest`/`UserProfileResponse` shadow `schemas.py` copies.
- **Leagues** (`routers/leagues.py`): create (`POST /`, 3–50 char name validated by `LeagueCreateRequest` regex `^[a-zA-Z0-9 _'-]+$` → 422 on violation, unique 6-char invite code from ambiguity-free alphabet, creator auto-joins as member #1, 10-league-per-user cap → 400), join by code (`POST /join`, uppercased/trimmed, 404 unknown code, 400 already a member, same 10-league cap), leave (`POST /{league_id}/leave {user_id}` — creator leaving transfers ownership to oldest remaining member, sole-member leave disbands the league), per-user list (`GET /user/{user_id}`, newest-first, live member counts), and a league-scoped leaderboard (`GET /{league_id}/leaderboard`, same NAV/FPTS computation as global but member-restricted; 404 unknown league).
- **Leaderboard** (`routers/leaderboard.py`): `GET /` with `sort_by=nav|weekly|season`, week/season defaulting from Sleeper state (2026 / week 6 fallback). Ranks assigned post-sort from 1.
- **Admin** (`routers/admin.py`, NO auth): `POST /snapshot/trigger` and `POST /scores/sync`, both accepting optional season/week. Baseline `base_price` is **seed-only** — no admin route may modify it after seeding.
- **Support** (`routers/support.py`): contact endpoint relayed via Resend, with local-log fallback when no API key is set.

## 6. Schemas (`app/schemas.py`)

Trade request/response plus live preview shape; rich `PlayerDetailResponse` with bio, ownership, rankings, price history, stat breakdowns, game logs, and past seasons; user profile, holdings/portfolio, league create/join/response, leaderboard entries with weekly/season FPTS, and transaction rows with headshots.

## 7. Services

Sleeper client over stdlib urllib with 30-minute cache and stale fallback; scoring pipeline that freezes Thursday snapshots then maps shares times PPR into weekly user scores; APScheduler ET crons for Thursday snapshots and Sun/Mon/Tue scoring (incl. the Tuesday 6 AM stat-correction true-up — scoring only, never prices); headshot URL helper; Supabase JWT auth with dev fallback and auto-provision. `base_price` is written only at seed time — no cron, route, or service function may change it.

## 8. DB, Seed and Env

Seed pulls the full Sleeper catalog (Active QB/RB/WR/TE with team + name) plus current-week projections, prices each player at `weekly_proj_pts_ppr × $1M` floored at $0.5M, and upserts on `external_id` (reruns refresh name/position/team AND reprice `base_price`/`current_price` for existing rows; new rows open at a ZERO-share baseline — `current_price = base_price`, `total_shares_outstanding = 0.00`). Users are persistent (never wiped): keeps `demo_trader` ($100M, onboarded) plus four rivals (`alpha_quant` $65M, `gridiron_whale` $40M, `sleeper_scout` $82M, `redzone_degen` $25M), then runs starter legs through the real cost function only when no holdings exist, persisting only the traded player's spot after each leg. Env covers database, unused Redis, Resend, and Supabase secret. Compose runs Postgres only.

## 9. Tests

SQLite in-memory harness with one onboarded demo user and one zero-share player (with base_price); API route tests for health, check-username (available/taken/invalid), market, empty portfolio, and `DELETE /users/me` cascade; AMM tests assert the zero-share baseline equals `base_price`, the hard floor, leader pricing, buy/sell symmetry, validation, BUY/SELL preview shapes, and that Simpson execution pricing matches a 1,000-step trapezoidal integral within $0.05; trade tests compute expectations live from the AMM (preview, buy+sell, insufficient cash/holdings, history); cleanup tests prove `POST /recalibrate-base-prices` 404s, the Tuesday recalibration cron no longer exists, and `scoring.recalibrate_market_baselines` / `sleeper.get_weekly_projections` are gone; league tests cover create (+unknown-user 404, name-validation 422s, 10-league cap on create AND join, creator auto-membership), join/duplicate/bad-code paths, leave (ownership-transfer + sole-member disband + non-member 400), per-user listing, member-scoped leaderboard (high-NAV outsider excluded, weekly + NAV sorts, unknown-league 404), and friends-routes-gone 404s. 31 tests.

## 10. Gotchas for LLM

Global per-player supply feeds the league-wide softmax; reads compute spots on the fly (stale `current_price` columns are display-only except the just-traded player) and every execute locks only user + traded player. Preview sell checks global supply while execution checks the user holding; trade and admin routes are unauthenticated; scoring uses raw-share snapshots; detail endpoint is heavy and fail-soft; profile schemas exist twice; created timestamps mix naive and aware values; league membership scopes leaderboards (the league leaderboard values holdings at persisted `current_price`, same as the global board — not live AMM spots); week columns are numeric; `sleeper.py` may carry a BOM (read with `utf-8-sig`); baseline `base_price` is written only at seed time — no cron or admin route may change it.

## 11. Copy-Paste Context Prompt

> Cover0 FastAPI backend with league-wide prior-weighted softmax P_i=floor+V_float·softmax(λ(S)·ln w0_i + s_i/b(S)), b(S)=150+0.03·S, λ(S)=1/(1+S/5000); Simpson 3-point execution pricing; compute-on-read market list/detail, trade preview/execute/history persisting only the traded player's spot, live-price portfolio NAV, Supabase authed profiles, invite-code private leagues with member-scoped leaderboards, sortable global leaderboard, unauthenticated admin snapshot/scores triggers (baselines are seed-only), Resend support, Thursday snapshot plus Sun/Mon/Tue scoring crons, zero-share-baseline Sleeper-synced seed with demo and rivals.
