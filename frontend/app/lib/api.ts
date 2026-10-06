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
}

export async function fetchDemoUser() {
  const res = await fetch(`${API_BASE_URL}/users/demo`);
  if (!res.ok) throw new Error("Failed to fetch demo user");
  return res.json();
}

export async function fetchPortfolio(userId: string): Promise<Portfolio> {
  const res = await fetch(`${API_BASE_URL}/portfolio/${userId}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch portfolio");
  return res.json();
}

export async function fetchPlayers(): Promise<Player[]> {
  const res = await fetch(`${API_BASE_URL}/market/players`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch players");
  return res.json();
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