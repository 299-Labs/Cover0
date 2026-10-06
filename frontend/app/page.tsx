"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchDemoUser, fetchPortfolio, fetchPlayers, Portfolio, Player, Holding } from "./lib/api";
import Navbar from "./components/Navbar";
import TradeModal from "./components/TradeModal";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [tradeSide, setTradeSide] = useState<"BUY" | "SELL">("SELL");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const user = await fetchDemoUser();
      setUserId(user.id);
      const [portfolioData, playersData] = await Promise.all([
        fetchPortfolio(user.id),
        fetchPlayers(),
      ]);
      setPortfolio(portfolioData);
      setPlayers(playersData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load portfolio";
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

  const getOwnedShares = (playerId: string) => {
    const holding = portfolio?.holdings.find((h) => h.player_id === playerId);
    return holding ? holding.shares_owned : 0;
  };

  const openTradeModal = (holding: Holding) => {
    // Prefer full Player record for spot price + team; fallback to holding data
    const full = players.find((p) => p.id === holding.player_id);
    const player: Player = full ?? {
      id: holding.player_id,
      external_id: holding.player_id,
      name: holding.player_name,
      position: holding.position,
      team: "",
      current_price: holding.current_price,
      total_shares_outstanding: 0,
    };
    setSelectedPlayer(player);
    setTradeSide("SELL");
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24">
      <div className="max-w-3xl mx-auto px-4 pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight">COVER0</h1>
            <p className="text-sm text-slate-400">@demo_trader</p>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 animate-pulse">
            LIVE AMM
          </span>
        </div>

        {loading && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
            Loading market positions...
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl p-4 text-sm font-medium">
            {error}
          </div>
        )}

        {portfolio && (
          <div className="space-y-6">
            {/* NAV Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/60 rounded-2xl p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Portfolio NAV
              </p>
              <p className="text-4xl font-black mt-1">
                {formatCurrency(portfolio.total_nav)}
              </p>
              <div className="grid grid-cols-2 gap-4 mt-5">
                <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                    Available Cash
                  </p>
                  <p className="text-lg font-bold mt-1">
                    {formatCurrency(portfolio.cash_balance)}
                  </p>
                </div>
                <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                    Invested Assets
                  </p>
                  <p className="text-lg font-bold mt-1">
                    {formatCurrency(portfolio.total_holdings_value)}
                  </p>
                </div>
              </div>
            </div>

            {/* Holdings Section */}
            <div>
              <h2 className="text-lg font-bold mb-3">Active Positions</h2>
              {portfolio.holdings.length === 0 ? (
                <div className="bg-slate-900 border border-dashed border-slate-700 rounded-2xl p-8 text-center text-slate-400 text-sm">
                  No active player positions. Visit the Market tab to place your first trade!
                </div>
              ) : (
                <div className="space-y-3">
                  {portfolio.holdings.map((item) => {
                    const isProfit = item.unrealized_pnl >= 0;
                    return (
                      <div
                        key={item.player_id}
                        onClick={() => openTradeModal(item)}
                        className="bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-2xl p-4 flex items-center justify-between gap-4 cursor-pointer transition-colors active:scale-[0.99]"
                        title="Tap to trade"
                      >
                        <div className="min-w-0">
                          <p className="font-bold truncate">{item.player_name}</p>
                          <p className="text-xs text-slate-400">{item.position}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {item.shares_owned} shares @ {formatCurrency(item.avg_buy_price)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold">{formatCurrency(item.market_value)}</p>
                          <p
                            className={`text-xs font-bold flex items-center justify-end gap-1 mt-1 ${
                              isProfit ? "text-emerald-400" : "text-red-400"
                            }`}
                          >
                            {isProfit ? (
                              <ArrowUpRight size={14} />
                            ) : (
                              <ArrowDownRight size={14} />
                            )}
                            {formatCurrency(item.unrealized_pnl)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
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