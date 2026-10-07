"use client";

import { useEffect, useState } from "react";
import { fetchDemoUser, fetchLeaderboard, LeaderboardEntry } from "../lib/api";
import Navbar from "../components/Navbar";
import { Trophy, Medal, Award } from "lucide-react";

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [user, board] = await Promise.all([fetchDemoUser(), fetchLeaderboard()]);
        setCurrentUserId(user.id);
        setLeaderboard(board);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load leaderboard";
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Trophy size={20} className="text-yellow-400" />;
    if (rank === 2) return <Medal size={20} className="text-slate-300" />;
    if (rank === 3) return <Award size={20} className="text-amber-600" />;
    return <span className="text-sm font-black text-slate-400 w-5 text-center">#{rank}</span>;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24">
      <div className="max-w-3xl mx-auto px-4 pt-8">
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
          <Trophy size={22} className="text-yellow-400" />
          GLOBAL RANKS
        </h1>
        <p className="text-sm text-slate-400 mb-6">Ranked by Total Portfolio NAV</p>

        {loading && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
            Loading rankings...
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl p-4 text-sm font-medium text-center">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-3">
            {leaderboard.map((entry) => {
              const isCurrentUser = entry.user_id === currentUserId;
              return (
                <div
                  key={entry.user_id}
                  className={`bg-slate-900 border rounded-2xl p-4 flex items-center gap-4 ${
                    isCurrentUser ? "border-emerald-500/40 bg-emerald-500/5" : "border-slate-800"
                  }`}
                >
                  <div className="shrink-0 w-8 flex justify-center">{getRankBadge(entry.rank)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate flex items-center gap-2">
                      @{entry.username}
                      {isCurrentUser && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          YOU
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Cash: {formatCurrency(entry.cash_balance)} • Assets:{" "}
                      {formatCurrency(entry.holdings_value)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                      Total NAV
                    </p>
                    <p className="font-bold font-mono">{formatCurrency(entry.total_nav)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Navbar />
    </div>
  );
}