"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import {
  fetchMyProfile,
  fetchUserLeagues,
  createLeague,
  joinLeague,
  fetchLeagueLeaderboard,
  League,
  LeaderboardEntry,
} from "../lib/api";
import Navbar from "../components/Navbar";
import {
  Plus,
  Copy,
  Check,
  Trophy,
  Medal,
  Award,
  Orbit
} from "lucide-react";

type LeaderboardView = "nav" | "weekly" | "season";

function LeaguesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [activeLeague, setActiveLeague] = useState<League | null>(null);
  const [standings, setStandings] = useState<LeaderboardEntry[]>([]);
  const [activeTab, setActiveTab] = useState<LeaderboardView>("nav");

  // Loading states
  const [loadingLeagues, setLoadingLeagues] = useState(true);
  const [loadingStandings, setLoadingStandings] = useState(false);

  // Forms & Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLeagueName, setNewLeagueName] = useState("");
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  // Alerts & UX feedback
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Check for ?join=CODE in URL query params
  useEffect(() => {
    const codeParam = searchParams.get("join");
    if (codeParam) {
      setJoinCodeInput(codeParam.toUpperCase());
    }
  }, [searchParams]);

  // 1. Initial auth and league fetch
  const loadLeagues = useCallback(
    async (preferredLeagueId?: string) => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          router.replace("/login");
          return;
        }

        const profile = await fetchMyProfile();
        setCurrentUserId(profile.id);

        const userLeagues = await fetchUserLeagues(profile.id);
        setLeagues(userLeagues);

        if (userLeagues.length > 0) {
          const selected = preferredLeagueId
            ? userLeagues.find((l) => l.id === preferredLeagueId) || userLeagues[0]
            : userLeagues[0];
          setActiveLeague(selected);
        } else {
          setActiveLeague(null);
          setStandings([]);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load leagues";
        setError(msg);
      } finally {
        setLoadingLeagues(false);
      }
    },
    [router]
  );

  useEffect(() => {
    loadLeagues();
  }, [loadLeagues]);

  // 2. Fetch scoped standings when active league or view tab changes
  useEffect(() => {
    if (!activeLeague) return;

    async function loadStandings() {
      setLoadingStandings(true);
      setError(null);
      try {
        const board = await fetchLeagueLeaderboard(activeLeague!.id, activeTab);
        setStandings(board);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load standings";
        setError(msg);
      } finally {
        setLoadingStandings(false);
      }
    }

    loadStandings();
  }, [activeLeague, activeTab]);

  // Create League Handler
  const handleCreateLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId || !newLeagueName.trim()) return;

    setCreating(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const created = await createLeague({
        name: newLeagueName.trim(),
        user_id: currentUserId,
      });
      setSuccessMsg(`Created "${created.name}"! Share code: ${created.invite_code}`);
      setNewLeagueName("");
      setShowCreateModal(false);
      await loadLeagues(created.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create league";
      setError(msg);
    } finally {
      setCreating(false);
    }
  };

  // Join League Handler
  const handleJoinLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId || !joinCodeInput.trim()) return;

    setJoining(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const joined = await joinLeague({
        invite_code: joinCodeInput.trim(),
        user_id: currentUserId,
      });
      setSuccessMsg(`Joined "${joined.name}"!`);
      setJoinCodeInput("");
      await loadLeagues(joined.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to join league";
      setError(msg);
    } finally {
      setJoining(false);
    }
  };

  const handleCopyInviteLink = () => {
    if (!activeLeague) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const joinUrl = `${origin}/Cover0/leagues?join=${activeLeague.invite_code}`;
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

        {/* Header with Title and Create Action */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#f0e9fe] flex items-center gap-2">
              <Orbit className="text-[#a6ece0]" size={24} />
              Private Leagues
            </h1>
            <p className="text-xs text-[#506c64] font-medium mt-0.5">
              Private league leaderboards
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-2 rounded-xl bg-[#a6ece0] text-[#080d0b] text-xs font-bold flex items-center gap-1.5 transition-all hover:bg-[#a6ece0]/90 shadow-md cursor-pointer shrink-0"
          >
            <Plus size={15} />
            Create
          </button>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl p-3 text-sm font-medium text-center mb-4">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="bg-[#a6ece0]/10 border border-[#a6ece0]/30 text-[#a6ece0] rounded-xl p-3 text-sm font-medium text-center mb-4">
            {successMsg}
          </div>
        )}

        {/* Quick Join Input */}
        <div className="bg-[#121916] border border-[#506c64]/30 rounded-2xl p-4 mb-6 shadow-xl">
          <p className="text-[11px] font-bold tracking-wider text-[#a6ece0] mb-2.5 flex items-center gap-1.5">
            Join a private league with an invite code
          </p>
          <form onSubmit={handleJoinLeague} className="flex gap-2">
            <input
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
              placeholder="e.g. X9K2L"
              maxLength={10}
              className="flex-1 bg-[#080d0b] border border-[#506c64]/30 rounded-xl px-4 py-2.5 text-sm uppercase tracking-widest font-mono text-[#f0e9fe] placeholder-[#506c64] focus:outline-none focus:border-[#a6ece0]/50 transition-all font-bold"
            />
            <button
              type="submit"
              disabled={joining || !joinCodeInput.trim()}
              className="px-5 py-2.5 rounded-xl bg-[#506c64]/30 hover:bg-[#a6ece0] hover:text-[#080d0b] text-[#f0e9fe] text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              {joining ? "Joining..." : "Join"}
            </button>
          </form>
        </div>

        {/* Skeleton loading when initial leagues load */}
        {loadingLeagues && (
          <div className="bg-[#121916] border border-[#506c64]/30 rounded-2xl p-10 text-center text-[#506c64] animate-pulse">
            Loading your leagues...
          </div>
        )}

        {/* Zero State: User belongs to 0 leagues */}
        {!loadingLeagues && leagues.length === 0 && (
          <div className="bg-[#121916] border border-dashed border-[#506c64]/40 rounded-2xl p-10 text-center">
            <Orbit size={36} className="text-[#506c64] mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#f0e9fe]">No Leagues Joined Yet</h3>
            <p className="text-xs text-[#506c64] max-w-sm mx-auto mt-1 mb-5">
              Create a private league to compete with your friends
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-xl bg-[#a6ece0] text-[#080d0b] text-xs font-bold transition-all hover:bg-[#a6ece0]/90"
            >
              Create Your First League
            </button>
          </div>
        )}

        {/* Active League Standings & Selector */}
        {!loadingLeagues && leagues.length > 0 && activeLeague && (
          <div>
            {/* League Tabs / Switcher */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
              {leagues.map((league) => {
                const isSelected = activeLeague.id === league.id;
                return (
                  <button
                    key={league.id}
                    onClick={() => setActiveLeague(league)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? "bg-[#a6ece0]/15 text-[#a6ece0] border border-[#a6ece0]/40 shadow-sm"
                        : "bg-[#121916] text-[#506c64] border border-[#506c64]/30 hover:text-[#f0e9fe] hover:border-[#506c64]/70"
                    }`}
                  >
                    <Orbit size={13} className={isSelected ? "text-[#a6ece0]" : "text-[#506c64]"} />
                    {league.name}
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#080d0b] text-[#506c64]">
                      {league.member_count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* League Banner: Details & Invite Action */}
            <div className="bg-[#121916] border border-[#506c64]/30 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-[#f0e9fe] flex items-center gap-2">
                  {activeLeague.name}
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#506c64]/20 text-[#a6ece0] font-bold">
                    {activeLeague.member_count} {activeLeague.member_count === 1 ? "member" : "members"}
                  </span>
                </h2>
                <p className="text-xs text-[#506c64] mt-0.5">
                  Invite Code: <span className="font-mono text-[#f0f3bd] font-bold tracking-wider">{activeLeague.invite_code}</span>
                </p>
              </div>

              <button
                onClick={handleCopyInviteLink}
                className="px-3.5 py-2 rounded-xl bg-[#080d0b] border border-[#506c64]/40 hover:border-[#a6ece0]/50 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer text-[#a6ece0]"
              >
                {copied ? <Check size={14} className="text-[#a6ece0]" /> : <Copy size={14} />}
                {copied ? "Link Copied!" : "Copy Invite Link"}
              </button>
            </div>

            {/* Metric Switcher Tabs */}
            <div className="flex bg-[#121916] border border-[#506c64]/30 p-1 rounded-xl mb-4">
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
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === key
                      ? "bg-[#a6ece0]/15 text-[#a6ece0] border border-[#a6ece0]/30 shadow-sm"
                      : "text-[#506c64] hover:text-[#f0e9fe]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Loading standings */}
            {loadingStandings && (
              <div className="bg-[#121916] border border-[#506c64]/30 rounded-2xl p-8 text-center text-[#506c64] animate-pulse">
                Updating league standings...
              </div>
            )}

            {/* Scoped Leaderboard Entries */}
            {!loadingStandings && (
              <div className="space-y-2.5">
                {standings.map((entry) => {
                  const isCurrentUser = Boolean(currentUserId && entry.user_id === currentUserId);

                  return (
                    <Link
                      key={entry.user_id}
                      href={isCurrentUser ? "/profile" : `/users/${entry.user_id}`}
                      className={`border rounded-xl p-4 flex items-center gap-4 transition-all block cursor-pointer ${
                        isCurrentUser
                          ? "border-[#a6ece0] bg-[#a6ece0]/10 shadow-[0_0_24px_rgba(166,236,224,0.12)] ring-1 ring-[#a6ece0]/40"
                          : "border-[#506c64]/30 bg-[#121916] hover:border-[#506c64]/80 hover:bg-[#141e1b]"
                      }`}
                    >
                      {/* Rank Badge */}
                      <div className="shrink-0 w-7 flex justify-center">{getRankBadge(entry.rank)}</div>

                      {/* Trader Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate flex items-center gap-2 text-[#f0e9fe] text-sm">
                          <span className={isCurrentUser ? "text-[#a6ece0]" : ""}>
                            {entry.username}
                          </span>
                          {isCurrentUser && (
                            <span className="text-[10px] font-black tracking-wider px-2 py-0.5 rounded-full bg-[#a6ece0] text-[#080d0b] shadow-sm">
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

                      {/* Metric Display */}
                      <div className="text-right shrink-0">
                        <p className="text-[10px] uppercase tracking-wider text-[#506c64] font-bold">
                          {activeTab === "nav" && "Total Portfolio"}
                          {activeTab === "weekly" && "Weekly FPTS"}
                          {activeTab === "season" && "Season FPTS"}
                        </p>
                        <p className={`font-bold font-mono text-sm ${isCurrentUser ? "text-[#a6ece0]" : "text-[#f0f3bd]"}`}>
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
        )}

        {/* Create League Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-[#121916] border border-[#506c64]/40 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
              <h3 className="text-lg font-black text-[#f0e9fe] mb-1">Create Private League</h3>
              <p className="text-xs text-[#506c64] mb-4">
                Pick a league name. An invite link will be generated instantly for your friends.
              </p>

              <form onSubmit={handleCreateLeague}>
                <div className="mb-4">
                  <label className="text-[11px] uppercase tracking-wider font-bold text-[#a6ece0] block mb-2">
                    League Name
                  </label>
                  <input
                    value={newLeagueName}
                    onChange={(e) => setNewLeagueName(e.target.value)}
                    placeholder="e.g. Sunday Degens"
                    maxLength={50}
                    autoFocus
                    className="w-full bg-[#080d0b] border border-[#506c64]/30 rounded-xl px-4 py-2.5 text-sm text-[#f0e9fe] placeholder-[#506c64] focus:outline-none focus:border-[#a6ece0]/50 transition-all font-medium"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-[#506c64] hover:text-[#f0e9fe] transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !newLeagueName.trim()}
                    className="px-5 py-2 rounded-xl bg-[#a6ece0] text-[#080d0b] text-xs font-bold hover:bg-[#a6ece0]/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {creating ? "Creating..." : "Create League"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
      <Navbar />
    </div>
  );
}

export default function LeaguesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080d0b]" />}>
      <LeaguesContent />
    </Suspense>
  );
}
