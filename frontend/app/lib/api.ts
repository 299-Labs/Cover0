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

export interface PlayerDetail extends Player {
  price_history: PricePoint[];
  stats?: PlayerStats;
}

export async function fetchPlayerDetail(playerId: string): Promise<PlayerDetail> {
  const res = await fetch(`${API_BASE_URL}/market/players/${playerId}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch player details");
  const data = await res.json();
  return {
    ...data,
    current_price: Number(data.current_price),
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

export interface Friend {
  id: string;
  friend_id: string;
  friend_username: string;
  friend_nav: number;
  created_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  cash_balance: number;
  holdings_value: number;
  total_nav: number;
}

export async function fetchFriends(userId: string): Promise<Friend[]> {
  const res = await fetch(`${API_BASE_URL}/friends/${userId}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch friends");
  return res.json();
}

export async function addFriend(userId: string, friendUsername: string): Promise<Friend> {
  const res = await fetch(`${API_BASE_URL}/friends`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, friend_username: friendUsername }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to add friend");
  }

  return res.json();
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const res = await fetch(`${API_BASE_URL}/leaderboard`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch leaderboard");
  return res.json();
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
