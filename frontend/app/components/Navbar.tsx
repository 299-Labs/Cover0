"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PieChart, TrendingUp, Users, Trophy } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Portfolio", icon: PieChart },
    { href: "/market", label: "Market", icon: TrendingUp },
    { href: "/friends", label: "Friends", icon: Users },
    { href: "/leaderboard", label: "Ranks", icon: Trophy },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur border-t border-slate-800">
      <div className="max-w-3xl mx-auto grid grid-cols-4 px-2 py-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center gap-1 py-2 rounded-xl text-[11px] font-semibold transition-colors ${
                isActive
                  ? "text-emerald-400 bg-emerald-500/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <Icon size={20} />
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}