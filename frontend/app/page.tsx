"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchDemoUser, fetchPortfolio, fetchTradeHistory, Portfolio, Transaction } from "./lib/api";
import Navbar from "./components/Navbar";
import { ArrowUpRight, ArrowDownRight, History, ShoppingBag, ArrowLeftRight } from "lucide-react";

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const user = await fetchDemoUser();
      const [portfolioData, historyData] = await Promise.all([
        fetchPortfolio(user.id),
        fetchTradeHistory(user.id),
      ]);
      setPortfolio(portfolioData);
      setTransactions(historyData);
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
                    const isProfit = Number(item.unrealized_pnl) >= 0;
                    return (
                      <div
                        key={item.player_id}
                        className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4"
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
                            {isProfit ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                            {formatCurrency(item.unrealized_pnl)}
                          </p>
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
                <History size={18} className="text-slate-400" />
                <h2 className="text-lg font-bold">Trade History</h2>
              </div>

              {transactions.length === 0 ? (
                <div className="bg-slate-900 border border-dashed border-slate-800 rounded-2xl p-6 text-center text-slate-500 text-sm">
                  No transactions executed yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => {
                    const isBuy = tx.side === "BUY";
                    return (
                      <div
                        key={tx.id}
                        className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                              isBuy
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                : "bg-red-500/10 border-red-500/30 text-red-400"
                            }`}
                          >
                            {isBuy ? <ShoppingBag size={16} /> : <ArrowLeftRight size={16} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-sm">{tx.player_name}</p>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  isBuy
                                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                    : "bg-red-500/15 text-red-400 border-red-500/30"
                                }`}
                              >
                                {tx.side}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {tx.shares} shares @ {formatCurrency(tx.price_per_share)} •{" "}
                              {new Date(tx.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="font-bold text-sm font-mono">
                            {formatCurrency(tx.total_amount)}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {new Date(tx.timestamp).toLocaleDateString()}
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

      <Navbar />
    </div>
  );
}