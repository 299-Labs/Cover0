"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchDemoUser, fetchPlayers, fetchPortfolio, Player, Portfolio } from "../lib/api";
import Navbar from "../components/Navbar";
import TradeModal from "../components/TradeModal";
import PlayerDetailModal from "../components/PlayerDetailModal";
import { ShoppingBag, ArrowLeftRight, Search, X, User as UserIcon } from "lucide-react";

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

  // Detail Modal State
  const [detailPlayerId, setDetailPlayerId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Trade Modal State
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [tradeSide, setTradeSide] = useState<"BUY" | "SELL">("BUY");
  const [isTradeOpen, setIsTradeOpen] = useState(false);

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

  const openPlayerDetail = (playerId: string) => {
    setDetailPlayerId(playerId);
    setIsDetailOpen(true);
  };

  const openTradeModal = (player: Player, side: "BUY" | "SELL") => {
    setSelectedPlayer(player);
    setTradeSide(side);
    setIsTradeOpen(true);
  };

  const getOwnedShares = (playerId: string) => {
    const holding = portfolio?.holdings.find((h) => h.player_id === playerId);
    return holding ? holding.shares_owned : 0;
  };

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
    <div className="min-h-screen bg-[#080d0b] text-[#f0e9fe] pb-28 antialiased">
      <div className="max-w-3xl mx-auto px-4 pt-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#f0e9fe]">NFL Market</h1>
            <p className="text-xs text-[#506c64] font-medium mt-0.5">Live Player Prices</p>
          </div>
          {portfolio && (
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-[#506c64] tracking-wider">Cash Balance</p>
              <p className="text-sm font-bold font-mono text-[#f0f3bd]">
                {formatCurrency(portfolio.cash_balance)}
              </p>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-3.5 text-[#506c64]" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search player or team..."
            className="w-full bg-[#121916] border border-[#506c64]/30 rounded-2xl pl-11 pr-10 py-3 text-sm text-[#f0e9fe] placeholder-[#506c64] focus:outline-none focus:border-[#a6ece0]/50 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-3.5 text-[#506c64] hover:text-[#f0e9fe] transition-colors"
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
                  ? "bg-[#a6ece0] text-[#0b110f] shadow-md"
                  : "bg-[#121916] border border-[#506c64]/30 text-[#506c64] hover:text-[#f0e9fe] hover:bg-[#506c64]/20"
              }`}
            >
              {pos}
            </button>
          ))}
        </div>

        {/* Skeleton Loading State */}
        {loading && (
          <div className="grid gap-3 sm:grid-cols-2 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-40 bg-[#121916] rounded-2xl border border-[#506c64]/30" />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-2xl p-4 text-sm font-medium mb-6">
            {error}
          </div>
        )}

        {/* Empty Search State */}
        {!loading && !error && filteredPlayers.length === 0 && (
          <div className="bg-[#121916] border border-dashed border-[#506c64]/40 rounded-2xl p-8 text-center text-[#506c64] text-sm">
            No players found matching &quot;{searchQuery}&quot;.
          </div>
        )}

        {/* Player Grid */}
        {!loading && !error && (
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredPlayers.map((player) => {
              const owned = getOwnedShares(player.id);
              return (
                <div
                  key={player.id}
                  className="bg-[#121916] border border-[#506c64]/30 rounded-2xl p-4 flex flex-col justify-between gap-4 transition-all hover:border-[#506c64]/70 cursor-pointer"
                  onClick={() => openPlayerDetail(player.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#080d0b] border border-[#506c64]/30 overflow-hidden shrink-0 flex items-center justify-center">
                      {player.headshot_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={player.headshot_url} alt={player.name} className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="text-[#506c64]" size={20} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-sm text-[#f0e9fe] truncate">{player.name}</h3>
                        {owned > 0 && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#0b110f] text-[#a6ece0] border border-[#506c64]/40 shrink-0">
                            {owned} SH
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#506c64] font-medium">
                        {player.position} • {player.team}
                      </p>
                      <p className="text-lg font-black font-mono text-[#f0f3bd] mt-1">
                        {formatCurrency(player.current_price)}
                      </p>
                    </div>
                  </div>

                  {/* Buttons (stopPropagation prevents opening player details modal when clicking buy/sell) */}
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#506c64]/30" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openTradeModal(player, "BUY")}
                      className="py-2 px-3 rounded-xl bg-[#a6ece0]/10 hover:bg-[#a6ece0]/20 border border-[#a6ece0]/30 text-[#a6ece0] text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <ShoppingBag size={13} /> BUY
                    </button>
                    <button
                      disabled={owned <= 0}
                      onClick={() => openTradeModal(player, "SELL")}
                      className="py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ArrowLeftRight size={13} /> SELL
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Player Detail Modal */}
      <PlayerDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        playerId={detailPlayerId}
        userOwnedShares={detailPlayerId ? getOwnedShares(detailPlayerId) : 0}
        onOpenTrade={(side) => {
          const p = players.find((pl) => pl.id === detailPlayerId);
          if (p) openTradeModal(p, side);
        }}
      />

      {/* Trade Modal */}
      {userId && (
        <TradeModal
          isOpen={isTradeOpen}
          onClose={() => setIsTradeOpen(false)}
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