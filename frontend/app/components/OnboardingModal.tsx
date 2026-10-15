"use client";

import { useState, useEffect } from "react";
import { checkUsernameAvailability, updateMyProfile } from "../lib/api";
import { Sparkles, Check, AlertCircle, Loader2 } from "lucide-react";

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (confirmedHandle: string) => void;
}

export default function OnboardingModal({ isOpen, onComplete }: OnboardingModalProps) {
  const [handle, setHandle] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "available" | "unavailable">("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const trimmed = handle.trim();
    if (trimmed.length < 3) {
      setStatus("idle");
      setStatusMsg("");
      return;
    }

    const timer = setTimeout(async () => {
      setStatus("checking");
      const res = await checkUsernameAvailability(trimmed);
      if (res.available) {
        setStatus("available");
        setStatusMsg("Handle is available");
      } else {
        setStatus("unavailable");
        setStatusMsg(res.message);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [handle]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== "available") return;

    setSubmitting(true);
    try {
      await updateMyProfile({ username: handle.trim().toLowerCase() });
      onComplete(handle.trim().toLowerCase());
    } catch (err: unknown) {
      setStatus("unavailable");
      setStatusMsg(err instanceof Error ? err.message : "Failed to claim handle");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-[#121916] border border-[#a6ece0]/40 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-2 mb-2 text-[#a6ece0]">
          <h2 className="text-lg font-black text-[#a6ece0]">Claim Your Username</h2>
        </div>
        <p className="text-xs text-[#506c64] mb-5 leading-relaxed">
          Choose a unique handle for your trading profile.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#a6ece0] mb-2">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-sm font-mono font-bold text-[#506c64]">@</span>
              <input
                type="text"
                autoFocus
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="gridiron_whale"
                maxLength={20}
                className="w-full bg-[#080d0b] border border-[#506c64]/40 rounded-xl pl-8 pr-10 py-2.5 text-sm text-[#a6ece0] font-mono font-bold placeholder-[#506c64] focus:outline-none focus:border-[#a6ece0] transition-colors"
              />
              <div className="absolute right-3.5 top-3">
                {status === "checking" && <Loader2 size={16} className="text-[#506c64] animate-spin" />}
                {status === "available" && <Check size={16} className="text-[#a6ece0]" />}
                {status === "unavailable" && <AlertCircle size={16} className="text-rose-400" />}
              </div>
            </div>

            {statusMsg && (
              <p className={`text-[11px] font-medium mt-1.5 ${status === "available" ? "text-[#a6ece0]" : "text-rose-400"}`}>
                {statusMsg}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={status !== "available" || submitting}
            className="w-full py-3 bg-[#a6ece0] text-[#080d0b] rounded-xl text-xs font-bold uppercase tracking-wider transition-all hover:bg-[#a6ece0]/90 disabled:opacity-30 disabled:cursor-not-allowed shadow-md cursor-pointer"
          >
            {submitting ? "Claiming..." : "Confirm & Start Trading"}
          </button>
        </form>
      </div>
    </div>
  );
}
