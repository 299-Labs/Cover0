"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

  // 1. Listen for auth changes (handles email verification links & Google redirects)
  useEffect(() => {
    // If user is already authenticated or just returned with a session token
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace("/");
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.replace("/");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

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
          options: {
            data: { username: username || email.split("@")[0] },
            // Ensures confirmation email links land on your /Cover0 base path
            emailRedirectTo: `${window.location.origin}/Cover0`,
          },
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
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/Cover0`,
      },
    });

    if (error) {
      setError(error.message);
    }
  };

  // Light green typed text, password dots, caret, and autofill overrides
  const inputClasses = `
    w-full bg-[#080d0b] border border-[#506c64]/40 rounded-xl px-3.5 py-2.5 text-sm
    text-[#a6ece0] caret-[#a6ece0] placeholder-[#506c64]
    focus:outline-none focus:border-[#a6ece0] transition-colors
    [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_#0e1714_inset]!
    [&:-webkit-autofill]:[-webkit-text-fill-color:#a6ece0]!
    [&:-webkit-autofill:hover]:[box-shadow:0_0_0_1000px_#0e1714_inset]!
    [&:-webkit-autofill:hover]:[-webkit-text-fill-color:#a6ece0]!
    [&:-webkit-autofill:focus]:[box-shadow:0_0_0_1000px_#0e1714_inset]!
    [&:-webkit-autofill:focus]:[-webkit-text-fill-color:#a6ece0]!
    [&:-webkit-autofill]:border-[#a6ece0]/50
  `.replace(/\s+/g, " ").trim();

  return (
    <div className="min-h-screen bg-[#080d0b] text-[#f0e9fe] pb-28 antialiased">
      <div className="max-w-md mx-auto px-4 pt-12">
        
        {/* Title */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="flex items-center gap-3 justify-center">
            <img src="/Cover0/icon.png" alt="Cover 0 Logo" className="w-8 h-8 rounded-md" />
            <h1 className="text-3xl font-black tracking-tight text-[#a6ece0]">Cover 0</h1>
          </div>
          <p className="text-xs text-[#506c64] font-medium mt-1">Fantasy Football Asset Exchange</p>
        </div>

        {/* Mode Switcher */}
        <div className="flex bg-[#121916] border border-[#506c64]/30 p-1 rounded-xl mb-6">
          <button
            onClick={() => { setMode("signin"); setError(null); setMessage(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              mode === "signin" ? "bg-[#a6ece0]/15 text-[#a6ece0] border border-[#a6ece0]/30" : "text-[#506c64]"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode("signup"); setError(null); setMessage(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              mode === "signup" ? "bg-[#a6ece0]/15 text-[#a6ece0] border border-[#a6ece0]/30" : "text-[#506c64]"
            }`}
          >
            Create Account
          </button>
          <button
            onClick={() => { setMode("forgot"); setError(null); setMessage(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
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
                className={inputClasses}
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
              className={inputClasses}
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
                className={inputClasses}
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

          {/* Hide Google Identity for Forgot Password */}
          {mode !== "forgot" && (
            <>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#506c64]/20" /></div>
                <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-[#121916] px-2 text-[#506c64]">Or continue with</span></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full py-2.5 bg-[#080d0b] hover:bg-[#141e1b] border border-[#506c64]/30 rounded-xl text-xs font-bold text-[#a6ece0] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </button>
            </>
          )}
        </form>

        {/* Privacy Policy */}
        <div className="flex justify-center mt-6">
          <Link href="/privacy" className="text-[11px] text-[#506c64] hover:text-[#a6ece0] cursor-pointer">
            Privacy Policy
          </Link>
        </div>
      </div>
      <Navbar />
    </div>
  );
}