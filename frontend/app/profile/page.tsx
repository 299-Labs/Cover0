"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { fetchMyProfile, updateMyProfile } from "../lib/api";
import Navbar from "../components/Navbar";
import { Camera, User as UserIcon, Lock, LogOut, Mail, CheckCircle2, AlertCircle } from "lucide-react";

interface ProfileData {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  cash_balance: number;
  created_at: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [username, setUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          router.push("/login");
          return;
        }
        const userProfile = await fetchMyProfile();
        setProfile(userProfile);
        setUsername(userProfile.username);
      } catch (err: unknown) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploadingAvatar(true);
    setStatusMsg(null);
    setErrorMsg(null);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${profile.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const avatarUrl = publicUrlData.publicUrl;
      await updateMyProfile({ avatar_url: avatarUrl });
      setProfile({ ...profile, avatar_url: avatarUrl });
      setStatusMsg("Avatar updated successfully.");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to upload avatar.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setErrorMsg(null);
    try {
      await updateMyProfile({ username });
      setStatusMsg("Username updated.");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to update username.");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }
    setStatusMsg(null);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setStatusMsg("Password updated successfully.");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to update password.");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[#080d0b] text-[#f0e9fe] pb-28 antialiased">
      <div className="max-w-xl mx-auto px-4 pt-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black tracking-tight text-[#f0e9fe]">Account Settings</h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors"
          >
            <LogOut size={14} /> Log Out
          </button>
        </div>

        {statusMsg && (
          <div className="bg-[#a6ece0]/10 border border-[#a6ece0]/30 rounded-xl p-3 flex items-center gap-2 text-[#a6ece0] text-xs font-medium mb-4">
            <CheckCircle2 size={15} /> <span>{statusMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 flex items-center gap-2 text-rose-300 text-xs font-medium mb-4">
            <AlertCircle size={15} /> <span>{errorMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="bg-[#121916] border border-[#506c64]/30 rounded-2xl p-8 text-center text-[#506c64] animate-pulse">
            Loading profile...
          </div>
        ) : profile && (
          <div className="space-y-6">
            
            {/* Avatar & Identifiers Card */}
            <div className="bg-[#121916] border border-[#506c64]/30 rounded-2xl p-6 flex items-center gap-5 shadow-xl">
              <div className="relative">
                <div className="w-18 h-18 rounded-2xl bg-[#080d0b] border border-[#506c64]/40 overflow-hidden flex items-center justify-center">
                  {profile.avatar_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="text-[#506c64]" size={32} />
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-2 -right-2 p-2 bg-[#a6ece0] text-[#080d0b] rounded-xl hover:bg-[#8ee0d2] transition-colors shadow-lg cursor-pointer disabled:opacity-50"
                >
                  <Camera size={14} />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-base truncate text-[#f0e9fe]">{profile.username}</p>
                <p className="text-xs text-[#506c64] truncate">{profile.email}</p>
                <p className="text-[11px] font-mono text-[#f0f3bd] mt-1">
                  Cash: ${Number(profile.cash_balance).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Change Username Form */}
            <form onSubmit={handleSaveUsername} className="bg-[#121916] border border-[#506c64]/30 rounded-2xl p-5 space-y-3">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#a6ece0]">
                Update Trader Handle
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="flex-1 bg-[#080d0b] border border-[#506c64]/40 rounded-xl px-3.5 py-2 text-sm text-[#f0e9fe] focus:outline-none focus:border-[#a6ece0]"
                />
                <button
                  type="submit"
                  className="px-4 bg-[#a6ece0]/15 hover:bg-[#a6ece0]/25 text-[#a6ece0] border border-[#a6ece0]/40 rounded-xl text-xs font-bold transition-all"
                >
                  Save
                </button>
              </div>
            </form>

            {/* Change Password Form */}
            <form onSubmit={handleChangePassword} className="bg-[#121916] border border-[#506c64]/30 rounded-2xl p-5 space-y-3">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#a6ece0] flex items-center gap-1.5">
                <Lock size={13} /> Change Password
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="New password (min 6 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="flex-1 bg-[#080d0b] border border-[#506c64]/40 rounded-xl px-3.5 py-2 text-sm text-[#f0e9fe] focus:outline-none focus:border-[#a6ece0]"
                />
                <button
                  type="submit"
                  className="px-4 bg-[#a6ece0]/15 hover:bg-[#a6ece0]/25 text-[#a6ece0] border border-[#a6ece0]/40 rounded-xl text-xs font-bold transition-all"
                >
                  Update
                </button>
              </div>
            </form>

            {/* Support Link */}
            <div className="bg-[#121916] border border-[#506c64]/30 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="block text-[11px] font-bold uppercase tracking-wider text-[#a6ece0] flex items-center gap-1.5">
                  <Mail size={15} className="text-[#a6ece0]" /> Contact Support
                </p>
                <p className="text-xs text-[#506c64] mt-0.5">Send a message to our team!</p>
              </div>
              <Link
                href="/support"
                className="px-4 py-2 bg-[#a6ece0]/15 hover:bg-[#a6ece0]/25 text-[#a6ece0] border border-[#a6ece0]/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center"
              >
                Contact
              </Link>
            </div>

          </div>
        )}
      </div>
      <Navbar />
    </div>
  );
}