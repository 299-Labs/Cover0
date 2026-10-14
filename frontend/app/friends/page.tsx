"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { fetchMyProfile, fetchFriends, addFriend, Friend } from "../lib/api";
import Navbar from "../components/Navbar";
import { UserPlus, Users } from "lucide-react";

export default function FriendsPage() {
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [inputUsername, setInputUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      // 1. Enforce Authentication — redirect unauthenticated visitors to /login
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        router.replace("/login");
        return;
      }

      // 2. Fetch authenticated profile & friends list (no demo fallback)
      const profile = await fetchMyProfile();
      setUserId(profile.id);

      const friendsData = await fetchFriends(profile.id);
      setFriends(friendsData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load friends";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !inputUsername.trim()) return;

    setAdding(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await addFriend(userId, inputUsername.trim());
      setSuccessMsg(`Added @${inputUsername.trim()} as a friend!`);
      setInputUsername("");
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add friend";
      setError(msg);
    } finally {
      setAdding(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val);

  return (
    <div className="min-h-screen bg-[#080d0b] text-[#f0e9fe] pb-28 antialiased">
      <div className="max-w-3xl mx-auto px-4 pt-8">

        {/* Add Friend Form */}
        <div className="bg-[#121916] border border-[#506c64]/30 rounded-2xl p-4 mb-6 shadow-xl">
          <p className="text-[11px] font-bold tracking-wider text-[#a6ece0] mb-3 flex items-center gap-2">
            <UserPlus size={14} />
            Add Friend by Username
          </p>
          <form onSubmit={handleAddFriend} className="flex gap-2">
            <input
              value={inputUsername}
              onChange={(e) => setInputUsername(e.target.value)}
              placeholder="e.g. trader_2"
              className="flex-1 bg-[#080d0b] border border-[#506c64]/30 rounded-xl px-4 py-2.5 text-sm text-[#f0e9fe] placeholder-[#506c64] focus:outline-none focus:border-[#a6ece0]/50 transition-all font-medium"
            />
            <button
              type="submit"
              disabled={adding || !inputUsername.trim()}
              className="px-4 py-2.5 rounded-xl bg-[#a6ece0] text-[#080d0b] text-sm font-bold transition-all hover:bg-[#a6ece0]/90 disabled:opacity-30 disabled:cursor-not-allowed shadow-md cursor-pointer"
            >
              {adding ? "Adding..." : "Add"}
            </button>
          </form>
          {error && (
            <div className="mt-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl p-3 text-sm font-medium text-center">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="mt-3 bg-[#a6ece0]/10 border border-[#a6ece0]/30 text-[#a6ece0] rounded-xl p-3 text-sm font-medium text-center">
              {successMsg}
            </div>
          )}
        </div>

        {/* Skeleton Loading State */}
        {loading && (
          <div className="bg-[#121916] border border-[#506c64]/30 rounded-2xl p-8 text-center text-[#506c64] animate-pulse">
            Loading friends list...
          </div>
        )}

        {!loading && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users size={16} className="text-[#a6ece0]" />
              <h2 className="text-base font-bold text-[#a6ece0]">
                Your Circle ({friends.length})
              </h2>
            </div>

            {friends.length === 0 ? (
              <div className="bg-[#121916] border border-dashed border-[#506c64]/40 rounded-2xl p-8 text-center text-[#506c64] text-sm">
                No friends added yet. Invite your friends to track & compare portfolios!
              </div>
            ) : (
              <div className="space-y-2.5">
                {friends.map((friend) => (
                  <Link
                    key={friend.id}
                    href={`/users/${friend.friend_id}`}
                    className="bg-[#121916] border border-[#506c64]/30 hover:border-[#506c64]/80 hover:bg-[#141e1b] rounded-xl p-4 flex items-center justify-between gap-4 transition-all block cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#0b110f] border border-[#506c64]/40 flex items-center justify-center font-bold font-mono text-[#a6ece0] text-xs">
                        {friend.friend_username.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-[#f0e9fe]">@{friend.friend_username}</p>
                        <p className="text-xs text-[#506c64]">Friend</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-[#506c64] font-bold">Portfolio Value</p>
                      <p className="font-bold font-mono text-sm text-[#f0f3bd]">
                        {formatCurrency(friend.friend_nav)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <Navbar />
    </div>
  );
}