# Cover 0 — Fantasy Football Asset Exchange

**[299labs.xyz/Cover0](https://299labs.xyz/Cover0)**

Buy and sell fractional shares of NFL players. Prices move on a league-wide automated market maker fed by live Sleeper data and weekly fantasy scoring — every trader starts with a $100M virtual bankroll (pure simulation, zero real money).

## What you can do

- **Trade players** — BUY/SELL fractional shares with live price-impact previews
- **Track your portfolio** — Net Asset Value, cash vs. invested, per-holding P&L, trade history
- **Browse the market** — searchable, position-filtered grid + deep player pages (bio, ownership, rankings, price history, stats, game logs)
- **Compete** — global leaderboard (portfolio value / weekly / season FPTS) plus private invite-code **leagues** with member-scoped standings
- **Manage your profile** — Supabase auth (email + Google), username claim, avatar upload, account deletion

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | Next.js 16 + React 19 + Tailwind v4, Vercel |
| Backend | FastAPI + SQLAlchemy, Postgres 16, APScheduler (weekly scoring crons), Supabase Auth/Storage, Render |
| Data | Sleeper API (rosters, stats, projections); Resend (support desk) |

**Market engine**: league-wide prior-weighted softmax with a $0.5M floor and Simpson-rule execution pricing — spots computed on read, only the traded player's spot persisted on execute.

## Docs

- [Backend overview](backend/BACKEND_OVERVIEW.md) — API, AMM math, models, services, tests
- [Frontend overview](frontend/FRONTEND_OVERVIEW.md) — routes, components, API client, auth flows

## Run locally

```bash
docker compose up -d          # Postgres on :5433
cd backend && python app/seed.py && uvicorn app.main:app --port 8000
cd frontend && npm install && npm run dev   # http://localhost:3000/Cover0
```


