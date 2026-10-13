"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import Navbar from "../components/Navbar";
import { LogIn, UserPlus, KeyRound, CheckCircle2, AlertCircle } from "lucide-react";

type AuthMode = "signin" | "signup" | "forgot";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/");
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username: username || email.split("@")[0] } },
        });
        if (error) throw error;
        setMessage("Verification link sent! Check your email to confirm your account.");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/Cover0/profile`,
        });
        if (error) throw error;
        setMessage("Password reset link dispatched to your inbox.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/Cover0` },
    });
  };

  return (
    <div className="min-h-screen bg-[#080d0b] text-[#f0e9fe] pb-28 antialiased">
      <div className="max-w-md mx-auto px-4 pt-12">
        
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tight text-[#f0e9fe]">Cover0 Market</h1>
          <p className="text-xs text-[#506c64] font-medium mt-1">Institutional Fantasy Asset Exchange</p>
        </div>

        {/* Mode Switcher */}
        <div className="flex bg-[#121916] border border-[#506c64]/30 p-1 rounded-xl mb-6">
          <button
            onClick={() => { setMode("signin"); setError(null); setMessage(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              mode === "signin" ? "bg-[#a6ece0]/15 text-[#a6ece0] border border-[#a6ece0]/30" : "text-[#506c64]"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode("signup"); setError(null); setMessage(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              mode === "signup" ? "bg-[#a6ece0]/15 text-[#a6ece0] border border-[#a6ece0]/30" : "text-[#506c64]"
            }`}
          >
            Create Account
          </button>
          <button
            onClick={() => { setMode("forgot"); setError(null); setMessage(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              mode === "forgot" ? "bg-[#a6ece0]/15 text-[#a6ece0] border border-[#a6ece0]/30" : "text-[#506c64]"
            }`}
          >
            Forgot
          </button>
        </div>

        {message && (
          <div className="bg-[#a6ece0]/10 border border-[#a6ece0]/30 rounded-xl p-4 flex items-center gap-3 text-[#a6ece0] text-xs font-medium mb-6">
            <CheckCircle2 size={16} />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-center gap-3 text-rose-300 text-xs font-medium mb-6">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleAuth} className="bg-[#121916] border border-[#506c64]/30 rounded-2xl p-6 space-y-4 shadow-xl">
          {mode === "signup" && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#a6ece0] mb-1.5">
                Trader Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="gridiron_whale"
                className="w-full bg-[#080d0b] border border-[#506c64]/40 rounded-xl px-3.5 py-2.5 text-sm text-[#f0e9fe] placeholder-[#506c64] focus:outline-none focus:border-[#a6ece0]"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#a6ece0] mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="trader@domain.com"
              className="w-full bg-[#080d0b] border border-[#506c64]/40 rounded-xl px-3.5 py-2.5 text-sm text-[#f0e9fe] placeholder-[#506c64] focus:outline-none focus:border-[#a6ece0]"
            />
          </div>

          {mode !== "forgot" && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#a6ece0] mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#080d0b] border border-[#506c64]/40 rounded-xl px-3.5 py-2.5 text-sm text-[#f0e9fe] placeholder-[#506c64] focus:outline-none focus:border-[#a6ece0]"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#a6ece0]/15 hover:bg-[#a6ece0]/25 text-[#a6ece0] border border-[#a6ece0]/40 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? "Processing..." : mode === "signin" ? (
              <><LogIn size={14} /> Log In</>
            ) : mode === "signup" ? (
              <><UserPlus size={14} /> Register</>
            ) : (
              <><KeyRound size={14} /> Send Reset Link</>
            )}
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#506c64]/20" /></div>
            <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-[#121916] px-2 text-[#506c64]">Or continue with</span></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full py-2.5 bg-[#080d0b] hover:bg-[#141e1b] border border-[#506c64]/30 rounded-xl text-xs font-bold text-[#f0e9fe] transition-all flex items-center justify-center gap-2"
          >
            Google Identity
          </button>
        </form>
      </div>
      <Navbar />
    </div>
  );
}