"use client";

import { useState } from "react";
import Navbar from "../components/Navbar";
import { Mail, Send, CheckCircle2, AlertCircle } from "lucide-react";

export default function SupportPage() {
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus("idle");
    setErrorMsg("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/support/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_email: email, subject, message }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to deliver message.");
      }

      setStatus("success");
      setSubject("");
      setMessage("");
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080d0b] text-[#f0e9fe] pb-28 antialiased">
      <div className="max-w-xl mx-auto px-4 pt-8">
        <div className="mb-6">
          <h1 className="text-2xl font-black tracking-tight text-[#f0e9fe] flex items-center gap-2">
            <Mail className="text-[#a6ece0]" size={24} /> Contact Support
          </h1>
          <p className="text-xs text-[#506c64] font-medium mt-1">
            Questions, bug reports, or feature requests sent straight to <span className="text-[#a6ece0]">cover0support@299labs.xyz</span>
          </p>
        </div>

        {status === "success" && (
          <div className="bg-[#a6ece0]/10 border border-[#a6ece0]/30 rounded-xl p-4 flex items-center gap-3 text-[#a6ece0] text-sm font-medium mb-6">
            <CheckCircle2 size={18} />
            <span>Ticket submitted successfully! Our team will follow up via email.</span>
          </div>
        )}

        {status === "error" && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-center gap-3 text-rose-300 text-sm font-medium mb-6">
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-[#121916] border border-[#506c64]/30 rounded-2xl p-6 space-y-4 shadow-xl">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#a6ece0] mb-1.5">
              Your Email Address
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

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#a6ece0] mb-1.5">
              Subject
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. AMM Trade Execution Issue"
              className="w-full bg-[#080d0b] border border-[#506c64]/40 rounded-xl px-3.5 py-2.5 text-sm text-[#f0e9fe] placeholder-[#506c64] focus:outline-none focus:border-[#a6ece0]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#a6ece0] mb-1.5">
              Message
            </label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe what you experienced..."
              className="w-full bg-[#080d0b] border border-[#506c64]/40 rounded-xl px-3.5 py-2.5 text-sm text-[#f0e9fe] placeholder-[#506c64] focus:outline-none focus:border-[#a6ece0] resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#a6ece0]/15 hover:bg-[#a6ece0]/25 text-[#a6ece0] border border-[#a6ece0]/40 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? "Transmitting..." : (
              <>
                <Send size={14} /> Send Inquiry
              </>
            )}
          </button>
        </form>
      </div>
      <Navbar />
    </div>
  );
}