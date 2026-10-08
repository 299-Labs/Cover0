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
    if (rank === 1) return <Trophy size={18} className="text-[#f0f3bd]" />;
    if (rank === 2) return <Medal size={18} className="text-[#a6ece0]" />;
    if (rank === 3) return <Award size={18} className="text-[#506c64]" />;
    return <span className="text-xs font-bold font-mono text-[#506c64] w-5 text-center">#{rank}</span>;
  };

  return (
    <div className="min-h-screen bg-[#080d0b] text-[#f0e9fe] pb-28 antialiased">
      <div className="max-w-3xl mx-auto px-4 pt-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-black tracking-tight text-[#f0e9fe] flex items-center gap-2">
            Global Ranks
          </h1>
          <p className="text-xs text-[#506c64] font-medium mt-0.5">Ranked by Total Portfolio Value</p>
        </div>

        {/* Skeleton Loading State */}
        {loading && (
          <div className="bg-[#121916] border border-[#506c64]/30 rounded-2xl p-8 text-center text-[#506c64] animate-pulse">
            Loading rankings...
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-2xl p-4 text-sm font-medium text-center mb-6">
            {error}
          </div>
        )}

        {/* Leaderboard Ranks */}
        {!loading && !error && (
          <div className="space-y-2.5">
            {leaderboard.map((entry) => {
              const isCurrentUser = entry.user_id === currentUserId;
              return (
                <div
                  key={entry.user_id}
                  className={`border rounded-xl p-4 flex items-center gap-4 transition-all ${
                    isCurrentUser
                      ? "border-[#a6ece0]/50 bg-[#a6ece0]/5"
                      : "border-[#506c64]/30 bg-[#121916] hover:border-[#506c64]/70"
                  }`}
                >
                  <div className="shrink-0 w-7 flex justify-center">{getRankBadge(entry.rank)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate flex items-center gap-2 text-[#f0e9fe] text-sm">
                      {entry.username}
                      {isCurrentUser && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#a6ece0]/15 text-[#a6ece0] border border-[#a6ece0]/30">
                          YOU
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-[#506c64] font-medium mt-0.5">
                      Cash: <span className="font-mono text-[#f0f3bd]/80">{formatCurrency(entry.cash_balance)}</span> | Assets: <span className="font-mono text-[#f0f3bd]/80">{formatCurrency(entry.holdings_value)}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] uppercase tracking-wider text-[#506c64] font-bold">
                      Total Portfolio Value
                    </p>
                    <p className="font-bold font-mono text-sm text-[#f0f3bd]">
                      {formatCurrency(entry.total_nav)}
                    </p>
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