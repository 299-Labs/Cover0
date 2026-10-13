"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchDemoUser, fetchLeaderboard, LeaderboardEntry } from "../lib/api";
import Navbar from "../components/Navbar";
import { Trophy, Medal, Award, Zap, DollarSign, Calendar } from "lucide-react";

type LeaderboardView = "nav" | "weekly" | "season";

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<LeaderboardView>("nav");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initUser() {
      try {
        const user = await fetchDemoUser();
        setCurrentUserId(user.id);
      } catch (err: unknown) {
        console.error(err);
      }
    }
    initUser();
  }, []);

  useEffect(() => {
    async function loadBoard() {
      setLoading(true);
      setError(null);
      try {
        const board = await fetchLeaderboard(activeTab);
        setLeaderboard(board);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load leaderboard";
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
    loadBoard();
  }, [activeTab]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val);

  const formatFPTS = (val: number) => `${val.toFixed(1)} pts`;

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
          <p className="text-xs text-[#506c64] font-medium mt-0.5">
            Real-time standings across portfolio value and fantasy output
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex bg-[#121916] border border-[#506c64]/30 p-1 rounded-xl mb-6">
          {(
            [
              ["nav", "Total Portfolio Value"],
              ["weekly", "Weekly FPTS"],
              ["season", "Season FPTS"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === key
                  ? "bg-[#a6ece0]/15 text-[#a6ece0] border border-[#a6ece0]/30"
                  : "text-[#506c64] hover:text-[#f0e9fe]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-[#121916] border border-[#506c64]/30 rounded-2xl p-8 text-center text-[#506c64] animate-pulse">
            Calculating standings...
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
                <Link
                  key={entry.user_id}
                  href={`/users/${entry.user_id}`}
                  className={`border rounded-xl p-4 flex items-center gap-4 transition-all block cursor-pointer ${
                    isCurrentUser
                      ? "border-[#a6ece0]/50 bg-[#a6ece0]/5 hover:border-[#a6ece0]"
                      : "border-[#506c64]/30 bg-[#121916] hover:border-[#506c64]/80 hover:bg-[#141e1b]"
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
                      {activeTab === "nav" ? (
                        <>
                          Cash: <span className="font-mono text-[#f0f3bd]/80">{formatCurrency(entry.cash_balance)}</span> | Assets:{" "}
                          <span className="font-mono text-[#f0f3bd]/80">{formatCurrency(entry.holdings_value)}</span>
                        </>
                      ) : (
                        <>
                          NAV: <span className="font-mono text-[#f0f3bd]/80">{formatCurrency(entry.total_nav)}</span>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-[10px] uppercase tracking-wider text-[#506c64] font-bold">
                      {activeTab === "nav" && "Total Portfolio"}
                      {activeTab === "weekly" && "Weekly FPTS"}
                      {activeTab === "season" && "Season FPTS"}
                    </p>
                    <p className="font-bold font-mono text-sm text-[#f0f3bd]">
                      {activeTab === "nav" && formatCurrency(entry.total_nav)}
                      {activeTab === "weekly" && formatFPTS(entry.weekly_fpts)}
                      {activeTab === "season" && formatFPTS(entry.season_fpts)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      <Navbar />
    </div>
  );
}