# Cover0 Frontend — LLM Context Overview

> Fantasy football share-trading UI: portfolio dashboard, searchable market, player deep-dives, social/league views, Supabase auth, and support. Talks to the FastAPI AMM backend. ALL data pages are auth-gated: no Supabase session → `router.replace/push("/login")` (portfolio, market, leagues, profile all redirect; leaderboard resolves the viewer only when signed in). No `demo_trader` fallback exists in the UI.

## 1. Tech Stack

- **Framework:** Next.js `16.3.8` App Router + React `19.2.8` + TypeScript `5` (strict, `jsx:react-jsx`, `@/*` maps to `./*`).
- **Styling:** Tailwind CSS v4 (`@import "tailwindcss"` in `app/globals.css`, `@tailwindcss/postcss` plugin). Dark trading theme: page `bg-[#080d0b]`, cards `bg-[#121916]`, accents mint `#a6ece0` / cream `#f0f3bd` / sage `#506c64`. Geist Sans/Mono via `next/font/google`.
- **Icons:** `lucide-react 1.52.0` throughout (portfolio, market, leagues, ranks, auth, support icons).
- **Charts:** `recharts 3.10.1` — now USED for the player price-history area chart in `PlayerDetailModal`.
- **Auth/data:** `@supabase/supabase-js 2.117.3` (`app/lib/supabase.ts` with `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`; empty-string fallback creates a client that fails at request time if env is missing).
- **Config:** `next.config.ts` sets `basePath: "/Cover0"` (serve/dev under `/Cover0`). `postcss.config.mjs`, `tsconfig.json`, `eslint-config-next` standard.
- **Conventions:** Every page is `"use client"`; data via `fetch(..., {cache:"no-store"})`; backend Decimals arrive as strings and are coerced with `Number()` in `lib/api.ts`; currency via `Intl.NumberFormat USD maximumFractionDigits 0`; no store/router middleware/tests.

## 2. Folder Structure

Eight routes (all `"use client"`) plus four shared modals:

```
frontend/
  next.config.ts              # basePath: "/Cover0" (all routes + OAuth redirects + logo live under /Cover0)
  package.json                # next 16.3.8, react 19.2.8, recharts 3.10.1, supabase-js 2.117.3, lucide-react 1.52.0
  app/
    layout.tsx                # Geist Sans/Mono, metadata "Cover 0", html/body shell
    globals.css               # @import "tailwindcss" (+ default Next theme vars; actual theme is inline hex classes)
    icon.png                  # app icon + login logo (`/Cover0/icon.png`)
    page.tsx                  # / portfolio dashboard (login-guarded, onboarding-gated)
    market/page.tsx           # /market searchable grid (login-guarded via fetchMyProfile)
    leagues/page.tsx          # /leagues create/join/leave + scoped leaderboard (login-guarded, Suspense for ?join=)
    leaderboard/page.tsx      # /leaderboard 3-view sortable ranks (public view, viewer highlight only if signed in)
    profile/page.tsx          # /profile settings incl. avatar/password/delete (login-guarded)
    login/page.tsx            # /login signin/signup/forgot + Google (auto-redirects to / when session exists)
    support/page.tsx          # /support contact form (direct fetch, no auth)
    privacy/page.tsx          # /privacy static policy (lastUpdated Oct 14 2026, no Navbar)
    users/[id]/page.tsx       # /users/:id read-only profile (requires login to view; trading disabled)
    components/
      Navbar.tsx              # fixed bottom tab bar (Portfolio/Market/Leagues/Ranks/Profile, exact-pathname highlight)
      TradeModal.tsx          # buy/sell sheet with 300 ms debounced AMM preview + 25%/50%/MAX presets
      PlayerDetailModal.tsx   # player deep-dive (recharts AreaChart, market/stats/gamelog tabs, read-only mode)
      OnboardingModal.tsx     # Google-OAuth handle claim (lowercase [a-z0-9_], live check-username, PATCH /users/me)
      ConfirmModal.tsx        # themed confirm (danger/default + loading/error; used for league-leave + account-delete)
    lib/
      api.ts                  # typed client, Decimal→Number coercion, Supabase bearer headers
      supabase.ts             # browser client from NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## 3. API Client (`app/lib/api.ts`)

Base `NEXT_PUBLIC_API_URL || http://localhost:8000/api/v1`. Typed models for holdings, portfolio, players, player detail, trade preview/execution, leagues + league-scoped leaderboard, global leaderboard, and transactions; `previewTrade`/`executeTrade` post JSON trade payloads (error `detail` surfaced, incl. Pydantic-array unwrap for league-name 422s); `checkUsernameAvailability` (used by login, profile is server-checked, and onboarding flows); authed `fetchMyProfile`/`updateMyProfile`/`deleteMyAccount` attach the Supabase bearer token; league helpers `fetchUserLeagues`/`createLeague`/`joinLeague`/`leaveLeague`/`fetchLeagueLeaderboard`; leaderboard (global and league) + portfolio + players + trade-history all map backend Decimal strings to numbers via `Number()`.

## 4. Routes and Components

Portfolio (`page.tsx`) redirects to `/login` when `supabase.auth.getSession()` is empty, otherwise loads `fetchMyProfile` → `fetchPortfolio` + `fetchTradeHistory` + `fetchPlayers` in parallel; pops `OnboardingModal` when `profile.is_onboarded === false`; shows NAV vs `INITIAL_VALUE = 100_000_000` with cash/invested cards, market-value-sorted holdings, and clickable trade history (opens read-trade `PlayerDetailModal`). Market (`market/page.tsx`) is login-gated via `fetchMyProfile` (failure → error state), with name/team search + QB/RB/WR/TE filter, price-desc sort, owned-share badges, SELL disabled at 0 shares, and `stopPropagation` on BUY/SELL so card clicks still open details. Leagues (`leagues/page.tsx`, `Suspense`-wrapped for `useSearchParams`) guards login, prefills join code from `?join=CODE`, validates new names client-side (`3–50 chars`, `/^[a-zA-Z0-9 _'-]+$/` → mirrors backend 422), creates/joins/leaves via `lib/api` (leave uses `ConfirmModal`; creator-leave transfers ownership, sole-member-leave disbands), and shows a member-scoped 3-view (`nav|weekly|season`) leaderboard with copyable invite link. Leaderboard (`leaderboard/page.tsx`) is publicly viewable — viewer id resolves only when a session exists (no demo fallback); rows link to `/profile` (self) or `/users/:id`; Trophy/Medal/Award for ranks 1–3. Profile (`profile/page.tsx`) guards login, uploads avatars to Supabase Storage `avatars` bucket (`{userId}-{Date.now()}.{ext}`, `upsert:true` → `getPublicUrl` → `updateMyProfile`), renames via PATCH (server enforces regex + uniqueness), changes password via `supabase.auth.updateUser`, signs out via `supabase.auth.signOut`, links `/support`, and deletes via `deleteMyAccount` + `ConfirmModal` (then `supabase.auth.signOut` + `router.push("/login")`). Login (`login/page.tsx`) auto-redirects to `/` on existing session/`SIGNED_IN`; signup lowercases + strips to `[a-z0-9_]` (max 20), debounced (300 ms) `checkUsernameAvailability` + pre-submit recheck, `supabase.auth.signUp({data:{username}, emailRedirectTo: {origin}/Cover0})` with empty-`identities` → "email already exists" guard; forgot uses `resetPasswordForEmail` → `{origin}/Cover0/profile`; Google uses `signInWithOAuth({redirectTo: {origin}/Cover0})`. Support (`support/page.tsx`) bypasses `lib/api` with a direct `fetch(.../support/contact)` POST. Public user pages (`users/[id]/page.tsx`) still require login (`fetchMyProfile` first), show a `YOUR PROFILE` badge on self-view, and render `PlayerDetailModal` WITHOUT `onOpenTrade` (footer reads "Read-only view · trading disabled"). Privacy (`privacy/page.tsx`) is static (no Navbar). Navbar is a fixed bottom 5-tab bar (`exact pathname === href` highlight). TradeModal resets on `player/initialSide/isOpen` change, debounces `previewTrade` 300 ms, presets 25%/50%/MAX (BUY `cash/spot` estimate vs integral cost; SELL `owned × pct`), and surfaces `detail` errors inline. PlayerDetailModal fetches on open, groups game logs by season (latest expanded), toggles season/week stat precision (`toFixed(1)` weekly vs rounded season), and shows BUY/SELL footer only when `onOpenTrade` is passed.

## 5. Gotchas for LLM

No `demo_trader` fallback anywhere in the UI (old doc line was wrong) — unauthenticated visits to `/`, `/market`, `/leagues`, `/profile`, `/users/:id` all end at `/login`. Leaderboard is the only page that renders without a session (viewer highlight simply stays off). Password-reset (`/Cover0/profile`) and OAuth/signup (`/Cover0`) redirects hardcode the `/Cover0` basePath; logo also lives at `/Cover0/icon.png`. Trade BUY presets estimate size from `cash / spot` rather than integral cost. Player stats card has fixed backend placeholders. Support bypasses the shared API client. Headshots use plain `<img>` with lint disables. Numbers lose backend cent/share precision by design (`Number()` coercion). `OnboardingModal` lowercases + strips handles client-side (`[^a-z0-9_]` removed) and only submits when `checkUsernameAvailability` says available (PATCH flips `is_onboarded` true). League-name client regex must stay in sync with backend `LEAGUE_NAME_REGEX`. `leagues/page.tsx` needs its `Suspense` boundary or `useSearchParams` breaks the build. `users/[id]` read-only mode is driven by omitting `onOpenTrade` from `PlayerDetailModal`. Username rules differ by surface: signup/profile claim enforce `[a-zA-Z0-9_]{3,20}`, league names allow `^[a-zA-Z0-9 _'-]+$` (3–50).

## 6. Copy-Paste Context Prompt

> Next.js 16.3.8 + React 19.2.8 + Tailwind v4 app at basePath /Cover0 with Supabase auth (ALL data pages login-guarded, no demo fallback; Google-OAuth handle claim via OnboardingModal → PATCH is_onboarded), portfolio/market/leagues/leaderboard/profile/login/support/privacy/public-user routes, trade + player-detail + onboarding + confirm modals, recharts price history, Supabase Storage avatar uploads, and a typed no-store API client that coerces backend Decimal strings (check-username, league create/join/leave, global + league leaderboards covered).
