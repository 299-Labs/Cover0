"use client";

import { useEffect, useState } from "react";
import { fetchDemoUser, fetchPlayers, executeTrade, Player } from "../lib/api";
import Navbar from "../components/Navbar";
import { ShoppingBag } from "lucide-react";

export default function MarketPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tradingPlayerId, setTradingPlayerId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const u = await fetchDemoUser();
        setUserId(u.id);
        const p = await fetchPlayers();
        setPlayers(p);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load market data";
        setStatusMsg(msg);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const handleBuy = async (playerId: string) => {
    if (!userId) return;
    setTradingPlayerId(playerId);
    setStatusMsg(null);
    try {
      await executeTrade({ user_id: userId, player_id: playerId, side: "BUY", shares: 1 });
      setStatusMsg("Trade executed! 1 share purchased.");

      // Refresh prices to reflect the AMM bonding curve movement
      const updatedPlayers = await fetchPlayers();
      setPlayers(updatedPlayers);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Trade failed";
      setStatusMsg(`Error: ${msg}`);
    } finally {
      setTradingPlayerId(null);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24">
      <div className="max-w-3xl mx-auto px-4 pt-8">
        <h1 className="text-2xl font-black tracking-tight">NFL MARKET</h1>
        <p className="text-sm text-slate-400 mb-6">Live AMM Spot Prices</p>

        {statusMsg && (
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 mb-4 text-sm text-center">
            {statusMsg}
          </div>
        )}

        {loading ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
            Fetching live spot prices...
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {players.map((p) => (
              <div
                key={p.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3"
              >
                <div>
                  <p className="font-bold leading-tight">{p.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {p.position} - {p.team}
                  </p>
                  <p className="text-sm font-semibold mt-2">
                    Spot Price: {formatCurrency(p.current_price)}
                  </p>
                </div>
                <button
                  onClick={() => handleBuy(p.id)}
                  disabled={tradingPlayerId === p.id}
                  className="bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs px-3 py-2 rounded-lg flex items-center justify-center gap-1 transition-all disabled:opacity-50"
                >
                  <ShoppingBag size={14} />
                  {tradingPlayerId === p.id ? "BUYING..." : "BUY 1 SH"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <Navbar />
    </div>
  );
}