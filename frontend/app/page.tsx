"use client";

import { useEffect, useState, useCallback } from "react";
import {
  fetchDemoUser,
  fetchPortfolio,
  fetchTradeHistory,
  fetchPlayers,
  Portfolio,
  Transaction,
  Player,
} from "./lib/api";
import Navbar from "./components/Navbar";
import PlayerDetailModal from "./components/PlayerDetailModal";
import TradeModal from "./components/TradeModal";
import { ArrowUpRight, ArrowDownRight, User as UserIcon } from "lucide-react";

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
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
      const [portfolioData, historyData, playersData] = await Promise.all([
        fetchPortfolio(user.id),
        fetchTradeHistory(user.id),
        fetchPlayers(),
      ]);
      setPortfolio(portfolioData);
      setTransactions(historyData);
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

  const formatCurrency = (val: number | string) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(Number(val) || 0);

  const INITIAL_VALUE = 100_000_000;
  const totalPnl = portfolio ? portfolio.total_nav - INITIAL_VALUE : 0;
  const totalPnlPercent = (totalPnl / INITIAL_VALUE) * 100;

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

  return (
    <div className="min-h-screen bg-[#080d0b] text-[#f0e9fe] pb-28 antialiased">
      <div className="max-w-3xl mx-auto px-4 pt-8">
        
        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-6 animate-pulse">
            <div className="h-48 bg-[#141e1b] rounded-2xl border border-[#506c64]/30" />
            <div className="h-64 bg-[#141e1b] rounded-2xl border border-[#506c64]/30" />
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-2xl p-4 text-sm font-medium mb-6">
            {error}
          </div>
        )}

        {!loading && portfolio && (
          <div className="space-y-6">
            
            {/* Main Portfolio Hero Card */}
            <div className="bg-[#121916] border border-[#506c64]/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#a6ece0]/5 rounded-full blur-3xl pointer-events-none" />
              
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#a6ece0]">
                  Total Portfolio Value
                </span>
                <div className="flex items-baseline gap-3 mt-1">
                  <p className="text-4xl font-extrabold text-[#f0f3bd] font-mono tracking-tight">
                    {formatCurrency(portfolio.total_nav)}
                  </p>
                  {totalPnl !== 0 && (
                    <span
                      className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-md ${
                        totalPnl >= 0 ? "bg-[#a6ece0]/15 text-[#a6ece0]" : "bg-rose-500/15 text-rose-400"
                      }`}
                    >
                      {totalPnl >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      {totalPnlPercent.toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>

              {/* Sub Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 mt-6 pt-5 border-t border-[#506c64]/30">
                <div className="bg-[#0b110f]/60 rounded-xl p-3.5 border border-[#506c64]/30">
                  <span className="text-[11px] font-semibold text-[#a6ece0]">Available Cash</span>
                  <p className="text-base font-bold mt-1 text-[#f0f3bd] font-mono">
                    {formatCurrency(portfolio.cash_balance)}
                  </p>
                </div>

                <div className="bg-[#0b110f]/60 rounded-xl p-3.5 border border-[#506c64]/30">
                  <span className="text-[11px] font-semibold text-[#a6ece0]">Active Investments</span>
                  <p className="text-base font-bold mt-1 text-[#f0f3bd] font-mono">
                    {formatCurrency(portfolio.total_holdings_value)}
                  </p>
                </div>
              </div>
            </div>

            {/* Active Holdings */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-[#a6ece0] flex items-center gap-2">
                  <span>Active Investments</span>
                  <span className="text-xs bg-[#506c64]/30 text-[#a6ece0] px-2 py-0.5 rounded-full font-mono">
                    {portfolio.holdings.length}
                  </span>
                </h2>
              </div>

              {portfolio.holdings.length === 0 ? (
                <div className="bg-[#121916] border border-dashed border-[#506c64]/40 rounded-2xl p-8 text-center text-[#506c64]">
                  <p className="text-sm font-medium">No active player investments.</p>
                  <p className="text-xs mt-1 text-[#506c64]/80">Explore the market tab to build your roster.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {portfolio.holdings.map((item) => {
                    const pnl = Number(item.unrealized_pnl);
                    const isProfit = pnl >= 0;
                    return (
                      <div
                        key={item.player_id}
                        onClick={() => openPlayerDetail(item.player_id)}
                        className="bg-[#121916] border border-[#506c64]/30 hover:border-[#506c64]/70 rounded-xl p-4 flex items-center justify-between transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-[#0b110f] border border-[#506c64]/40 overflow-hidden flex items-center justify-center shrink-0">
                            {item.headshot_url ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={item.headshot_url} alt={item.player_name} className="w-full h-full object-cover" />
                            ) : (
                              <UserIcon className="text-[#506c64]" size={20} />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="font-bold text-sm truncate text-[#f0e9fe]">
                              {item.player_name}
                            </p>
                            <p className="text-xs text-[#f0f3bd] font-medium mt-0.5">
                              {item.shares_owned} shares @ <span className="font-mono text-[#f0f3bd]/80">{formatCurrency(item.avg_buy_price)}</span>
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="font-bold font-mono text-sm text-[#f0f3bd]">
                            {formatCurrency(item.market_value)}
                          </p>
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <span
                              className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded flex items-center gap-0.5 ${
                                isProfit ? "bg-[#a6ece0]/10 text-[#a6ece0]" : "bg-rose-500/10 text-rose-400"
                              }`}
                            >
                              {isProfit ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                              {formatCurrency(pnl)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Trade Activity Feed */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-base font-bold text-[#a6ece0]">Trade History</h2>
              </div>

              {transactions.length === 0 ? (
                <div className="bg-[#121916] border border-dashed border-[#506c64]/40 rounded-2xl p-6 text-center text-[#506c64] text-xs">
                  No trade executions recorded yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.map((tx) => {
                    const isBuy = tx.side === "BUY";
                    return (
                      <div
                        key={tx.id}
                        onClick={() => openPlayerDetail(tx.player_id)}
                        className="bg-[#121916]/70 border border-[#506c64]/20 rounded-xl p-3.5 flex items-center justify-between hover:bg-[#121916] transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#0b110f] border border-[#506c64]/40 overflow-hidden flex items-center justify-center shrink-0">
                            {tx.headshot_url ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={tx.headshot_url} alt={tx.player_name} className="w-full h-full object-cover" />
                            ) : (
                              <UserIcon className="text-[#506c64]" size={18} />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-sm text-[#f0e9fe]">{tx.player_name}</p>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                  isBuy ? "bg-[#a6ece0]/10 text-[#a6ece0]" : "bg-rose-500/10 text-rose-400"
                                }`}
                              >
                                {tx.side}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#f0f3bd] mt-0.5">
                              {tx.shares} shares @ {formatCurrency(tx.price_per_share)}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="font-bold text-sm font-mono text-[#f0f3bd]">
                            {formatCurrency(tx.total_amount)}
                          </p>
                          <p className="text-[10px] text-[#506c64] mt-0.5">
                            {new Date(tx.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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