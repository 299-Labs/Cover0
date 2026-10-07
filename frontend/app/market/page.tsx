"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchDemoUser, fetchPlayers, fetchPortfolio, Player, Portfolio } from "../lib/api";
import Navbar from "../components/Navbar";
import TradeModal from "../components/TradeModal";
import { ShoppingBag, ArrowLeftRight, Search, X } from "lucide-react";

const POSITIONS = ["ALL", "QB", "RB", "WR", "TE"];

export default function MarketPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPosition, setSelectedPosition] = useState("ALL");

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

  // Client-side filtering logic
  const filteredPlayers = players.filter((player) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      player.name.toLowerCase().includes(query) ||
      player.team.toLowerCase().includes(query);
    const matchesPosition =
      selectedPosition === "ALL" || player.position === selectedPosition;
    return matchesSearch && matchesPosition;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24">
      <div className="max-w-3xl mx-auto px-4 pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight">NFL MARKET</h1>
            <p className="text-sm text-slate-400">Live AMM Spot Prices</p>
          </div>
          {portfolio && (
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-slate-500">Cash Balance</p>
              <p className="text-sm font-bold text-emerald-400">
                {formatCurrency(portfolio.cash_balance)}
              </p>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-3.5 text-slate-500" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search player or team..."
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-11 pr-10 py-3 text-sm text-slate-100 focus:outline-none focus:border-slate-700"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-3.5 text-slate-500 hover:text-slate-300"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Position Filter Pills */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-none">
          {POSITIONS.map((pos) => (
            <button
              key={pos}
              onClick={() => setSelectedPosition(pos)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedPosition === pos
                  ? "bg-slate-100 text-slate-950 shadow-md"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {pos}
            </button>
          ))}
        </div>

        {loading && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
            Loading market prices...
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl p-4 text-sm font-medium">
            {error}
          </div>
        )}

        {!loading && !error && filteredPlayers.length === 0 && (
          <div className="bg-slate-900 border border-dashed border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-sm">
            No players found matching &quot;{searchQuery}&quot;.
          </div>
        )}

        {!loading && !error && (
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredPlayers.map((player) => {
              const owned = getOwnedShares(player.id);
              return (
                <div
                  key={player.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all hover:border-slate-700"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg">{player.name}</h3>
                        <p className="text-xs text-slate-400">
                          {player.position} • {player.team}
                        </p>
                      </div>
                      {owned > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          Owned: {owned}
                        </span>
                      )}
                    </div>
                    <p className="text-2xl font-black mt-3">
                      {formatCurrency(player.current_price)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => openTradeModal(player, "BUY")}
                      className="py-2.5 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ShoppingBag size={14} /> BUY
                    </button>
                    <button
                      disabled={owned <= 0}
                      onClick={() => openTradeModal(player, "SELL")}
                      className="py-2.5 px-3 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ArrowLeftRight size={14} /> SELL
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