"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchDemoUser, fetchFriends, addFriend, Friend } from "../lib/api";
import Navbar from "../components/Navbar";
import { UserPlus, Users } from "lucide-react";

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [inputUsername, setInputUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const user = await fetchDemoUser();
      setUserId(user.id);
      const friendsData = await fetchFriends(user.id);
      setFriends(friendsData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load friends";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

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
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24">
      <div className="max-w-3xl mx-auto px-4 pt-8">
        <h1 className="text-2xl font-black tracking-tight">FRIENDS</h1>
        <p className="text-sm text-slate-400 mb-6">Track and compare portfolio values</p>

        {/* Add Friend Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
            <UserPlus size={14} />
            Add Friend by Username
          </p>
          <form onSubmit={handleAddFriend} className="flex gap-2">
            <input
              value={inputUsername}
              onChange={(e) => setInputUsername(e.target.value)}
              placeholder="e.g. trader_2"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-slate-700"
            />
            <button
              type="submit"
              disabled={adding || !inputUsername.trim()}
              className="px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-sm font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {adding ? "Adding..." : "Add"}
            </button>
          </form>
          {error && (
            <div className="mt-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm font-medium text-center">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="mt-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl p-3 text-sm font-medium text-center">
              {successMsg}
            </div>
          )}
        </div>

        {loading && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
            Loading friends list...
          </div>
        )}

        {!loading && (
          <div>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Users size={18} />
              Your Circle ({friends.length})
            </h2>
            {friends.length === 0 ? (
              <div className="bg-slate-900 border border-dashed border-slate-700 rounded-2xl p-8 text-center text-slate-400 text-sm">
                No friends added yet. Enter a username above to start tracking!
              </div>
            ) : (
              <div className="space-y-3">
                {friends.map((f) => (
                  <div
                    key={f.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="font-bold truncate">@{f.friend_username}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Added {new Date(f.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                        Portfolio NAV
                      </p>
                      <p className="font-bold font-mono">{formatCurrency(f.friend_nav)}</p>
                    </div>
                  </div>
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