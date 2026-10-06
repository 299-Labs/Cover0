"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchDemoUser, fetchPlayers, fetchPortfolio, Player, Portfolio } from "../lib/api";
import Navbar from "../components/Navbar";
import TradeModal from "../components/TradeModal";
import { ShoppingBag, ArrowLeftRight } from "lucide-react";

export default function MarketPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [tradeSide, setTradeSide] = useState<"BUY" | "SELL">("BUY");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const user = await fetchDemoUser();
      setUserId(user.id);
      const [playersData, portfolioData] = await Promise.all([
        fetchPlayers(),
        fetchPortfolio(user.id),
      ]);
      setPlayers(playersData);
      setPortfolio(portfolioData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load market";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val);

  const openTradeModal = (player: Player, side: "BUY" | "SELL") => {
    setSelectedPlayer(player);
    setTradeSide(side);
    setIsModalOpen(true);
  };

  const getOwnedShares = (playerId: string) => {
    const holding = portfolio?.holdings.find((h) => h.player_id === playerId);
    return holding ? holding.shares_owned : 0;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24">
      <div className="max-w-3xl mx-auto px-4 pt-8">
        <h1 className="text-2xl font-black tracking-tight">NFL MARKET</h1>
        <p className="text-sm text-slate-400 mb-6">Live AMM Spot Prices</p>

        {portfolio && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <ArrowLeftRight size={14} />
              Cash Balance
            </span>
            <span className="text-lg font-black font-mono">
              {formatCurrency(portfolio.cash_balance)}
            </span>
          </div>
        )}

        {loading && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
            Loading market prices...
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl p-4 text-sm font-medium text-center mb-4">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="grid gap-3 sm:grid-cols-2">
            {players.map((player) => {
              const owned = getOwnedShares(player.id);
              return (
                <div
                  key={player.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3"
                >
                  <div>
                    <h3 className="font-bold leading-tight">{player.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {player.position} • {player.team}
                    </p>
                    {owned > 0 && (
                      <span className="inline-block mt-2 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        Owned: {owned}
                      </span>
                    )}
                    <p className="text-sm font-semibold mt-2">
                      {formatCurrency(player.current_price)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => openTradeModal(player, "BUY")}
                      className="py-2.5 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ShoppingBag size={14} />
                      BUY
                    </button>
                    <button
                      onClick={() => openTradeModal(player, "SELL")}
                      disabled={owned <= 0}
                      title={owned <= 0 ? "No shares owned" : `Sell ${owned} shares`}
                      className="py-2.5 px-3 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ShoppingBag size={14} />
                      SELL
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {userId && (
        <TradeModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          player={selectedPlayer}
          userId={userId}
          userCashBalance={portfolio?.cash_balance || 0}
          userOwnedShares={selectedPlayer ? getOwnedShares(selectedPlayer.id) : 0}
          initialSide={tradeSide}
          onSuccess={loadData}
        />
      )}

      <Navbar />
    </div>
  );
}