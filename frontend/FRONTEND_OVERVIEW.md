# Cover0 Frontend — LLM Context Overview

> Fantasy football share-trading UI: portfolio dashboard, searchable market, player deep-dives, social/league views, Supabase auth, and support. Talks to the FastAPI AMM backend. Authenticated users hit real profiles; logged-out visitors fall back to `demo_trader` (market, friends, and public profiles still use demo directly).

## 1. Tech Stack

- **Framework:** Next.js `16.3.8` App Router + React `19.2.8` + TypeScript `5` (strict, `jsx:react-jsx`, `@/*` maps to `./*`).
- **Styling:** Tailwind CSS v4 (`@import "tailwindcss"` in `app/globals.css`, `@tailwindcss/postcss` plugin). Dark trading theme: page `bg-[#080d0b]`, cards `bg-[#121916]`, accents mint `#a6ece0` / cream `#f0f3bd` / sage `#506c64`. Geist Sans/Mono via `next/font/google`.
- **Icons:** `lucide-react 1.52.0` throughout (portfolio, market, friends, ranks, auth, support icons).
- **Charts:** `recharts 3.10.1` — now USED for the player price-history area chart in `PlayerDetailModal`.
- **Auth/data:** `@supabase/supabase-js 2.117.3` (`app/lib/supabase.ts` with `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`; empty-string fallback creates a client that fails at request time if env is missing).
- **Config:** `next.config.ts` sets `basePath: "/Cover0"` (serve/dev under `/Cover0`). `postcss.config.mjs`, `tsconfig.json`, `eslint-config-next` standard.
- **Conventions:** Every page is `"use client"`; data via `fetch(..., {cache:"no-store"})`; backend Decimals arrive as strings and are coerced with `Number()` in `lib/api.ts`; currency via `Intl.NumberFormat USD maximumFractionDigits 0`; no store/router middleware/tests.

## 2. Folder Structure

Eight routes plus two shared modals:

```
frontend/
  next.config.ts              # basePath: "/Cover0"
  package.json                # next 16.3.8, react 19.2.8, recharts, supabase-js, lucide-react
  app/
    layout.tsx                # Geist fonts, metadata "Cover 0", html/body shell
    globals.css               # @import "tailwindcss", theme vars
    icon.png                  # app icon (replaced default favicon)
    page.tsx                  # / portfolio dashboard (auth-aware, demo fallback)
    market/page.tsx           # /market searchable grid
    friends/page.tsx          # /friends circle + add-by-username
    leaderboard/page.tsx      # /leaderboard 3-view sortable ranks
    profile/page.tsx          # /profile settings (login-guarded)
    login/page.tsx            # /login signin/signup/forgot + Google
    support/page.tsx          # /support contact form
    users/[id]/page.tsx       # /users/:id public read-only profile
    components/
      Navbar.tsx              # bottom tab bar (5 tabs, active highlight)
      TradeModal.tsx           # buy/sell sheet with live AMM preview
      PlayerDetailModal.tsx    # player deep-dive (chart, stats, logs)
    lib/
      api.ts                  # typed client, Decimal coercion, auth headers
      supabase.ts             # browser client from public env keys
```

## 3. API Client (`app/lib/api.ts`)

Base `NEXT_PUBLIC_API_URL || http://localhost:8000/api/v1`. Typed models for holdings, portfolio, players, player detail, trade preview/execution, friends, leaderboard, and transactions; preview/execute post JSON trade payloads; authed profile fetch/PATCH attach the Supabase bearer token; leaderboard maps Decimal strings to numbers.

## 4. Routes and Components

Portfolio resolves Supabase session then demo fallback, shows NAV versus 100M with cash/invested cards, sorted holdings, and clickable trade history. Market adds search plus position filters and buy/sell modals. Friends adds by username and links to public profiles. Leaderboard sorts by portfolio, weekly, or season points and highlights the viewer. Profile guards login, edits avatar/username/password, and links support. Login covers sign-in, signup, reset, and Google. Support posts to the backend contact endpoint. Public user pages are read-only with no trade modal. Navbar tracks five tabs. Trade modal debounces live previews with presets and impact display. Player modal shows charts, ownership, rankings, projections, logs, and career table.

## 5. Gotchas for LLM

Identity is split between Supabase-auth pages and demo-backed market/friends/public views. Password reset and OAuth redirects hardcode the /Cover0 base path. Trade presets estimate BUY size from spot rather than integral cost. Player stats card has fixed backend placeholders. Support bypasses the shared API client. Headshots use plain img tags with lint disables. Numbers lose backend cent/share precision by design.

## 6. Copy-Paste Context Prompt

> Next.js 16 + React 19 + Tailwind v4 app at basePath /Cover0 with Supabase auth (session-first, demo fallback), portfolio/market/friends/leaderboard/profile/login/support/public-user routes, shared trade and player-detail modals, recharts price history, and a typed no-store API client that coerces backend Decimal strings.
