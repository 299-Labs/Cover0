# Cover0 Frontend — LLM Context Overview

> Fantasy football share-trading UI: mobile-style portfolio dashboard + market buy screen. Talks to FastAPI AMM backend. No auth — uses hardcoded `demo_trader`.

## 1. Tech Stack
- **Framework:** Next.js 16.3.8 (App Router) + React 19.2.8 + TypeScript 5 (strict, `jsx:react-jsx`, `@/*` -> `./*`)
- **Styling:** Tailwind CSS v4 (`@import "tailwindcss"` in `app/globals.css`, `@tailwindcss/postcss` plugin). Dark slate theme (`bg-slate-950`, cards `bg-slate-900`). Geist Sans/Mono via `next/font/google`.
- **Icons:** `lucide-react` (`PieChart, TrendingUp, Users, Trophy, ArrowUpRight/DownRight, ShoppingBag`)
- **Charts:** `recharts 3.10.1` installed but **unused** — no charts rendered yet.
- **Lint:** `eslint-config-next 16.3.8`
- **Config:** `next.config.ts` sets `basePath: "/Cover0"` (all routes served under `/Cover0`). `postcss.config.mjs` + `tsconfig.json` standard Next.js.

## 2. Folder Structure
```
frontend/
  package.json
  next.config.ts       # basePath /Cover0
  tsconfig.json
  eslint.config.mjs
  postcss.config.mjs
  app/
    layout.tsx         # RootLayout, Geist fonts, metadata (default CRA text), <body flex col>
    globals.css        # tailwind import + CSS vars + dark-mode vars
    page.tsx           # / -> PortfolioPage (NAV + holdings)
    market/
      page.tsx         # /market -> MarketPage (player grid + BUY 1 SH)
    components/
      Navbar.tsx       # bottom tab bar (Portfolio/Market/Friends/Ranks)
    lib/
      api.ts           # API_BASE_URL + types + fetch wrappers
    favicon.ico
  public/              # default Next.js SVGs only (file, globe, next, vercel, window)
```

No `app/friends/`, `app/leaderboard/`, no `middleware`, no `next-env.d.ts` committed, no tests, no state store, no `.env.local` (relies on `NEXT_PUBLIC_API_URL` fallback).

## 3. API Client (`app/lib/api.ts`)
- `API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"` — note: backend defaults to port 8000 via uvicorn, but docker postgres is 5433; no proxy/rewrites.
- Types (numbers, not strings — backend Decimal serialized as JSON numbers):
  `Player{id, external_id, name, position, team, current_price:number, total_shares_outstanding:number}`
  `Holding{player_id, player_name, position, shares_owned, avg_buy_price, current_price, market_value, unrealized_pnl}`
  `Portfolio{user_id, username, cash_balance, total_holdings_value, total_nav, holdings:Holding[]}`
- Functions:
  `fetchDemoUser() -> GET {BASE}/users/demo` (no-cache default, throws `Failed to fetch demo user`)
  `fetchPortfolio(userId) -> GET {BASE}/portfolio/{userId} {cache:no-store}`
  `fetchPlayers() -> GET {BASE}/market/players {cache:no-store}`
  `executeTrade({user_id, player_id, side:BUY|SELL, shares:number}) -> POST {BASE}/trade/execute JSON, throws err.detail || Trade failed`

## 4. Routes / Pages

- **`/` (`app/page.tsx`, `"use client"`, `PortfolioPage`):**
  Flow: `useEffect -> fetchDemoUser() -> fetchPortfolio(user.id)` with `loading/error` states.
  UI: max-w-3xl mobile container `bg-slate-950 text-slate-100 pb-24`. Header `COVER0 / @demo_trader` (hardcoded username display) + `LIVE AMM` pulsing badge. NAV card (gradient slate, 4xl NAV, 2-col grid Available Cash / Invested Assets). Active Positions list: each row `player_name, position, {shares} shares @ {avg}`, right side `market_value + PnL` green/red with ArrowUpRight/DownRight. Empty state prompts `Visit Market tab`. Currency via `Intl.NumberFormat USD maxFraction 0`. Renders `<Navbar/>`.

- **`/market` (`app/market/page.tsx`, `"use client"`, `MarketPage`):**
  Flow: `init() -> fetchDemoUser -> setUserId + fetchPlayers`. `handleBuy(playerId)`: `executeTrade({user_id, player_id, side:BUY, shares:1})`, statusMsg update, refetch players to show AMM price move. `tradingPlayerId` disables button to `BUYING...`.
  UI: `NFL MARKET / Live AMM Spot Prices`, status banner, grid `gap-3 sm:grid-cols-2` cards: `name, position-team, Spot Price`, emerald `BUY 1 SH` button (`ShoppingBag` icon). **BUY-only — no SELL UI, no quantity selector, no preview/price-impact, no sell proceeds display.**

- **`components/Navbar.tsx` (`"use client"`):**
  Fixed bottom `bg-slate-900/95 backdrop-blur border-t`, 4-col grid: `/->Portfolio(PieChart)`, `/market->Market(TrendingUp)`, `/friends->Friends(Users)`, `/leaderboard->Ranks(Trophy)`. Active via `usePathname()===href` -> emerald highlight. **`/friends` and `/leaderboard` routes don't exist yet — links 404.**

- **`app/layout.tsx`:** `RootLayout({children}: LayoutProps<"/">)` (Next 16 typed routes), `<html h-full antialiased>` + Geist vars, `<body min-h-full flex flex-col>`. Metadata still default `Create Next App`.

## 5. Styling / UX Conventions
- Mobile-first `max-w-3xl mx-auto px-4 pt-8 pb-24` (space for navbar). Cards `rounded-2xl border-slate-800`. All currency rounded to $0 decimals (loses cents precision vs backend Numeric(12,2)).
- No toasts/modal lib, no skeleton lib — plain divs for loading/error. No polling/websocket — refresh only after buy.

## 6. Key Invariants / Gotchas for LLM
- Backend coupling: expects `GET /users/demo{id}`, `GET /portfolio/{id}`, `GET /market/players`, `POST /trade/execute`. No handling for backend `400 Insufficient cash/shares` beyond `err.detail` string.
- Hardcoded to single demo user; no login, no user switching, no persisted userId (refetched every mount).
- Numbers as `number` risk float rounding vs backend Decimal; shares always `1` integer from UI (backend supports fractional Numeric(12,4)).
- `basePath: /Cover0` means `Link href="/"` resolves to `/Cover0`, and fetch URLs are absolute so unaffected — but local dev at `localhost:3000/Cover0` not `localhost:3000/`.
- Dead deps/routes: `recharts`, `/friends`, `/leaderboard`, `public/*.svg` unused. No SELL, no portfolio chart, no trade history (backend has no ledger anyway).
- To add SELL: reuse `executeTrade` with `side:SELL` + holding's `player_id` + shares input; to add quantity: change `shares:1` to state-controlled number input.

## 7. Copy-Paste Context Prompt
> Next.js 16 App Router + React 19 + Tailwind v4 frontend at basePath /Cover0. Files: app/page.tsx PortfolioPage (fetchDemoUser->fetchPortfolio, NAV/cash/invested/holdings list), app/market/page.tsx MarketPage (fetchPlayers grid, BUY 1 SH via executeTrade then refetch), components/Navbar.tsx bottom tabs (/, /market, /friends[missing], /leaderboard[missing]), lib/api.ts (API_BASE_URL localhost:8000/api/v1, types Player/Holding/Portfolio numbers, fetchDemoUser/fetchPortfolio/fetchPlayers/executeTrade). Styling slate-950 mobile max-w-3xl, Intl USD 0 decimals, lucide icons, recharts unused, no auth/sell/quantity.