"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function PrivacyPolicyPage() {
  const lastUpdated = "October 14, 2026";

  return (
    <div className="min-h-screen bg-[#080d0b] text-[#f0e9fe] pb-24 antialiased selection:bg-[#a6ece0]/20 selection:text-[#a6ece0]">
      <div className="max-w-3xl mx-auto px-4 pt-8">
        
        {/* Navigation */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#506c64] hover:text-[#a6ece0] transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft size={16} />
          Back to Terminal
        </Link>

        {/* Header */}
        <div className="border-b border-[#506c64]/30 pb-6 mb-8">
          <div className="flex items-center gap-2.5 mb-2">
            <ShieldCheck size={28} className="text-[#a6ece0]" />
            <h1 className="text-3xl font-black tracking-tight text-[#f0e9fe]">
              Privacy Policy
            </h1>
          </div>
          <p className="text-xs text-[#506c64] font-mono">
            Last Updated: {lastUpdated} • Cover0 Fantasy Sports Engine
          </p>
        </div>

        {/* Content Body */}
        <div className="space-y-8 text-sm text-[#f0e9fe]/90 leading-relaxed font-normal">
          
          {/* Important Disclaimer Card */}
          <div className="bg-[#121916] border border-[#a6ece0]/30 rounded-2xl p-5 text-xs text-[#a6ece0] space-y-2">
            <p className="font-bold tracking-wide uppercase text-[#f0f3bd]">
              Notice: Virtual Simulation & Entertainment Platform
            </p>
            <p className="text-[#f0e9fe]/80 leading-normal">
              Cover0 is a fantasy sports trading simulation game. All shares, player prices, cash balances ($100M starting allocation), and portfolio values are purely virtual and carry zero real-world monetary value. Cover0 is not a registered securities broker, financial exchange, or gambling operator.
            </p>
          </div>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#a6ece0] tracking-tight">
              1. Information We Collect
            </h2>
            <p className="text-xs text-[#506c64] leading-relaxed">
              We collect information necessary to provide authentication, save user portfolios, and compute fantasy leaderboard rankings:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-[#f0e9fe]/80">
              <li>
                <strong className="text-[#f0e9fe]">Account Credentials:</strong> Email address, username, profile picture (avatar), and secure auth tokens generated during signup or via Google OAuth.
              </li>
              <li>
                <strong className="text-[#f0e9fe]">Platform Activity:</strong> Simulated trade executions, buy/sell history, portfolio snapshots, league memberships, and weekly fantasy scoring logs.
              </li>
              <li>
                <strong className="text-[#f0e9fe]">Support Inquiries:</strong> Messages, feedback, and email addresses submitted through our contact and support desk forms.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#a6ece0] tracking-tight">
              2. How We Use Your Information
            </h2>
            <p className="text-xs text-[#506c64] leading-relaxed">
              Your information is exclusively used to operate the Cover0 platform:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-[#f0e9fe]/80">
              <li>Authenticating your session and safeguarding your portfolio against unauthorized trades.</li>
              <li>Calculating real-time automated market-maker (AMM) spot pricing and updating global and private league leaderboards.</li>
              <li>Responding to support tickets, platform bugs, and account issues.</li>
            </ul>
            <p className="text-xs text-[#506c64] italic">
              We do not sell, rent, or monetize your personal information or trading behavior to third-party data brokers or advertisers.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#a6ece0] tracking-tight">
              3. Third-Party Service Providers
            </h2>
            <p className="text-xs text-[#506c64] leading-relaxed">
              We integrate with reputable third-party infrastructure to power authentication, data synchronization, and support:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="bg-[#121916] border border-[#506c64]/30 rounded-xl p-3.5">
                <p className="font-bold text-xs text-[#f0f3bd]">Supabase & Google OAuth</p>
                <p className="text-[11px] text-[#506c64] mt-1">
                  Handles encrypted identity storage, password hashing, and OAuth 2.0 verification tokens.
                </p>
              </div>
              <div className="bg-[#121916] border border-[#506c64]/30 rounded-xl p-3.5">
                <p className="font-bold text-xs text-[#f0f3bd]">Sleeper API</p>
                <p className="text-[11px] text-[#506c64] mt-1">
                  Provides public NFL player rosters, injury states, and weekly game statistics for scoring.
                </p>
              </div>
              <div className="bg-[#121916] border border-[#506c64]/30 rounded-xl p-3.5">
                <p className="font-bold text-xs text-[#f0f3bd]">Resend</p>
                <p className="text-[11px] text-[#506c64] mt-1">
                  Securely relays transactional contact and bug report submissions to our customer support desk.
                </p>
              </div>
              <div className="bg-[#121916] border border-[#506c64]/30 rounded-xl p-3.5">
                <p className="font-bold text-xs text-[#f0f3bd]">Hosting & Cloud Infrastructure</p>
                <p className="text-[11px] text-[#506c64] mt-1">
                  Runs our PostgreSQL relational database and FastAPI computational AMM engine.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#a6ece0] tracking-tight">
              4. Data Retention & Account Deletion
            </h2>
            <p className="text-xs text-[#506c64] leading-relaxed">
              We retain account data for as long as your account remains active. You may request permanent deletion of your profile, transaction ledger, and portfolio holdings at any time by contacting our support desk at <span className="font-mono text-[#f0f3bd]">support@cover0.app</span>.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#a6ece0] tracking-tight">
              5. Contact Us
            </h2>
            <p className="text-xs text-[#506c64] leading-relaxed">
              If you have any questions or privacy concerns regarding this policy, please reach out via our{" "}
              <Link href="/support" className="text-[#a6ece0] underline underline-offset-2">
                support desk
              </Link>{" "}
              or email us at <span className="font-mono text-[#f0f3bd]">support@cover0.app</span>.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}