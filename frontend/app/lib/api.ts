import { supabase } from "./supabase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export interface Holding {
  player_id: string;
  player_name: string;
  position: string;
  shares_owned: number;
  avg_buy_price: number;
  current_price: number;
  market_value: number;
  unrealized_pnl: number;
  external_id?: string;
  headshot_url?: string;
}

export interface Portfolio {
  user_id: string;
  username: string;
  cash_balance: number;
  total_holdings_value: number;
  total_nav: number;
  holdings: Holding[];
}

export interface Player {
  id: string;
  external_id: string;
  name: string;
  position: string;
  team: string;
  current_price: number;
  total_shares_outstanding: number;
  headshot_url?: string;
}

export interface PricePoint {
  timestamp: string;
  price: number;
}

export interface PlayerStats {
  games_played: number;
  projected_fpts: number;
  last_game_fpts: number;
  touchdowns: number;
  primary_stat_label: string;
  primary_stat_value: string;
}

export interface PlayerBio {
  age?: number;
  height?: string;
  weight?: string;
  college?: string;
  years_exp?: number;
  number?: number;
  status?: string;
  injury_status?: string;
  injury_notes?: string;
}

export interface OwnershipMetrics {
  total_shares_outstanding: number;
  platform_user_holders: number;
  platform_ownership_pct: number;
}

export interface MarketRankings {
  fpts_rank: number;
  ownership_rank: number;
  value_rank: number;
  proj_value_rank: number;
}

export interface StatBreakdown {
  pts_ppr: number;
  pass_att: number;
  pass_cmp: number;
  pass_yd: number;
  pass_td: number;
  pass_int: number;
  rush_att: number;
  rush_yd: number;
  rush_td: number;
  rec_target: number;
  rec: number;
  rec_yd: number;
  rec_td: number;
  fum_lost: number;
}

export interface GameLogEntry {
  season: string;
  week: number;
  opponent: string;
  pts_ppr: number;
  pass_cmp: number;
  pass_att: number;
  pass_yd: number;
  pass_td: number;
  rush_att: number;
  rush_yd: number;
  rush_td: number;
  rec_target: number;
  rec: number;
  rec_yd: number;
  rec_td: number;
}

export interface PastSeasonSummary {
  season: string;
  team: string;
  games_played: number;
  pts_ppr: number;
  pass_cmp: number;
  pass_att: number;
  pass_yd: number;
  pass_td: number;
  pass_int: number;
  rush_att: number;
  rush_yd: number;
  rush_td: number;
  rec_target: number;
  rec: number;
  rec_yd: number;
  rec_td: number;
}

export interface PlayerDetail extends Player {
  current_week: number;
  bio?: PlayerBio;
  ownership?: OwnershipMetrics;
  rankings?: MarketRankings;
  price_history: PricePoint[];
  stats?: PlayerStats;
  season_actual_stats?: StatBreakdown;
  weekly_projected_stats?: StatBreakdown;
  season_projected_stats?: StatBreakdown;
  game_logs?: GameLogEntry[];
  past_seasons?: PastSeasonSummary[];
}

export async function fetchPlayerDetail(playerId: string): Promise<PlayerDetail> {
  const res = await fetch(`${API_BASE_URL}/market/players/${playerId}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch player details");
  const data = await res.json();
  return {
    ...data,
    current_price: Number(data.current_price),
    current_week: Number(data.current_week ?? 1),
    total_shares_outstanding: Number(data.total_shares_outstanding),
    price_history: (data.price_history ?? []).map((pt: { timestamp: string; price: number }) => ({
      timestamp: pt.timestamp,
      price: Number(pt.price),
    })),
  };
}

export interface TradePreviewResponse {
  player_id: string;
  side: "BUY" | "SELL";
  shares: number;
  current_price: number;
  total_amount: number;
  execution_price: number;
  new_price: number;
  price_impact_percent: number;
}

export interface TradeResponse {
  transaction_id: string;
  user_id: string;
  player_id: string;
  side: "BUY" | "SELL";
  shares: number;
  execution_price: number;
  total_amount: number;
  new_cash_balance: number;
  timestamp: string;
}

export async function fetchDemoUser() {
  const res = await fetch(`${API_BASE_URL}/users/demo`);
  if (!res.ok) throw new Error("Failed to fetch demo user");
  return res.json();
}

export async function fetchPortfolio(userId: string): Promise<Portfolio> {
  const res = await fetch(`${API_BASE_URL}/portfolio/${userId}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch portfolio");
  const data = await res.json();
  return {
    ...data,
    cash_balance: Number(data.cash_balance),
    total_holdings_value: Number(data.total_holdings_value),
    total_nav: Number(data.total_nav),
    holdings: (data.holdings ?? []).map((h: Record<string, unknown>) => ({
      ...h,
      shares_owned: Number(h.shares_owned),
      avg_buy_price: Number(h.avg_buy_price),
      current_price: Number(h.current_price),
      market_value: Number(h.market_value),
      unrealized_pnl: Number(h.unrealized_pnl),
    })),
  };
}

export async function fetchPlayers(): Promise<Player[]> {
  const res = await fetch(`${API_BASE_URL}/market/players`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch players");
  const data = await res.json();
  return (data as Record<string, unknown>[]).map((p) => ({
    ...(p as object),
    current_price: Number((p as Record<string, unknown>).current_price),
    total_shares_outstanding: Number((p as Record<string, unknown>).total_shares_outstanding),
  })) as Player[];
}

export async function previewTrade(payload: {
  user_id: string;
  player_id: string;
  side: "BUY" | "SELL";
  shares: number;
}): Promise<TradePreviewResponse> {
  const res = await fetch(`${API_BASE_URL}/trade/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to estimate trade preview");
  }

  const data = await res.json();
  // Backend serializes Decimals as strings (Pydantic default) — coerce to numbers.
  return {
    ...data,
    shares: Number(data.shares),
    current_price: Number(data.current_price),
    total_amount: Number(data.total_amount),
    execution_price: Number(data.execution_price),
    new_price: Number(data.new_price),
    price_impact_percent: Number(data.price_impact_percent),
  };
}

export async function executeTrade(payload: {
  user_id: string;
  player_id: string;
  side: "BUY" | "SELL";
  shares: number;
}) {
  const res = await fetch(`${API_BASE_URL}/trade/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Trade failed");
  }

  return res.json();
}

export interface League {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  member_count: number;
  created_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  cash_balance: number;
  holdings_value: number;
  total_nav: number;
  weekly_fpts: number;
  season_fpts: number;
}

export async function fetchUserLeagues(userId: string): Promise<League[]> {
  const res = await fetch(`${API_BASE_URL}/leagues/user/${userId}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch your leagues");
  return res.json();
}

export async function createLeague(payload: { name: string; user_id: string }): Promise<League> {
  const res = await fetch(`${API_BASE_URL}/leagues`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to create league");
  }

  return res.json();
}

export async function joinLeague(payload: { invite_code: string; user_id: string }): Promise<League> {
  const res = await fetch(`${API_BASE_URL}/leagues/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to join league");
  }

  return res.json();
}

export async function fetchLeagueLeaderboard(
  leagueId: string,
  sortBy: "nav" | "weekly" | "season" = "nav",
  week?: number
): Promise<LeaderboardEntry[]> {
  const params = new URLSearchParams({ sort_by: sortBy });
  if (week) params.append("week", week.toString());

  const res = await fetch(`${API_BASE_URL}/leagues/${leagueId}/leaderboard?${params.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch league standings");
  const data = await res.json();
  return data.map((entry: Record<string, unknown>) => ({
    ...entry,
    cash_balance: Number(entry.cash_balance),
    holdings_value: Number(entry.holdings_value),
    total_nav: Number(entry.total_nav),
    weekly_fpts: Number(entry.weekly_fpts),
    season_fpts: Number(entry.season_fpts),
  }));
}

export async function fetchLeaderboard(
  sortBy: "nav" | "weekly" | "season" = "nav",
  week?: number
): Promise<LeaderboardEntry[]> {
  const params = new URLSearchParams({ sort_by: sortBy });
  if (week) params.append("week", week.toString());

  const res = await fetch(`${API_BASE_URL}/leaderboard?${params.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch leaderboard");
  const data = await res.json();
  return data.map((entry: Record<string, unknown>) => ({
    ...entry,
    cash_balance: Number(entry.cash_balance),
    holdings_value: Number(entry.holdings_value),
    total_nav: Number(entry.total_nav),
    weekly_fpts: Number(entry.weekly_fpts),
    season_fpts: Number(entry.season_fpts),
  }));
}

export interface Transaction {
  id: string;
  user_id: string;
  player_id: string;
  player_name: string;
  player_position: string;
  side: "BUY" | "SELL";
  shares: number;
  price_per_share: number;
  total_amount: number;
  timestamp: string;
  external_id?: string;
  headshot_url?: string;
}

export async function fetchTradeHistory(userId: string): Promise<Transaction[]> {
  const res = await fetch(`${API_BASE_URL}/trade/history/${userId}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch trade history");
  const data = await res.json();
  // Backend serializes Decimals as strings — coerce to numbers.
  return (data as Record<string, unknown>[]).map((tx) => ({
    ...(tx as object),
    shares: Number((tx as Record<string, unknown>).shares),
    price_per_share: Number((tx as Record<string, unknown>).price_per_share),
    total_amount: Number((tx as Record<string, unknown>).total_amount),
  })) as Transaction[];
}

export async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

export async function fetchMyProfile() {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/users/me`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load user profile");
  return res.json();
}

export async function updateMyProfile(payload: { username?: string; avatar_url?: string }) {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/users/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Profile update failed");
  }
  return res.json();
}