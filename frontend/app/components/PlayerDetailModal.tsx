"use client";

import { useEffect, useState } from "react";
import { fetchPlayerDetail, PlayerDetail } from "../lib/api";
import { X, TrendingUp, ShoppingBag, ArrowLeftRight, User as UserIcon } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

interface PlayerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string | null;
  userOwnedShares: number;
  onOpenTrade: (side: "BUY" | "SELL") => void;
}

export default function PlayerDetailModal({
  isOpen,
  onClose,
  playerId,
  userOwnedShares,
  onOpenTrade,
}: PlayerDetailModalProps) {
  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (isOpen && playerId) {
      setLoading(true);
      setImgError(false);
      fetchPlayerDetail(playerId)
        .then(setPlayer)
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, playerId]);

  if (!isOpen || !playerId) return null;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);

  const chartData = player?.price_history.map((pt, idx) => ({
    time: idx === 0 ? "Start" : new Date(pt.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    price: pt.price,
  })) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#121916] border border-[#506c64]/40 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative text-[#f0e9fe]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-[#080d0b]/60 text-[#506c64] hover:text-[#f0e9fe] transition-all"
        >
          <X size={18} />
        </button>
        {loading ? (
          <div className="p-12 text-center text-[#506c64] text-sm font-medium animate-pulse">
            Loading player profile & chart...
          </div>
        ) : player ? (
          <div>
            <div className="p-6 bg-gradient-to-b from-[#1a2521] to-[#121916] border-b border-[#506c64]/30 flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-2xl bg-[#080d0b] border border-[#506c64]/40 overflow-hidden shrink-0 flex items-center justify-center">
                {!imgError && player.headshot_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={player.headshot_url} alt={player.name} className="w-full h-full object-cover" onError={() => setImgError(true)} />
                ) : (
                  <UserIcon className="text-[#506c64]" size={32} />
                )}
              </div>
              <div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#a6ece0]/10 text-[#a6ece0] border border-[#a6ece0]/30">
                  {player.position} • {player.team}
                </span>
                <h2 className="text-xl font-black mt-1 text-[#f0e9fe]">{player.name}</h2>
                <p className="text-2xl font-black font-mono text-[#f0f3bd] mt-0.5">{formatCurrency(player.current_price)}</p>
              </div>
            </div>
            <div className="p-6 border-b border-[#506c64]/30">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-[#506c64] uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-[#a6ece0]" /> Price History Trend
                </span>
                {userOwnedShares > 0 && (
                  <span className="text-xs font-bold text-[#a6ece0] bg-[#0b110f] px-2.5 py-0.5 rounded-full border border-[#506c64]/40">
                    You Own: {userOwnedShares} SH
                  </span>
                )}
              </div>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a6ece0" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#a6ece0" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" stroke="#506c64" fontSize={10} tickLine={false} />
                    <YAxis stroke="#506c64" fontSize={10} tickLine={false} domain={['dataMin - 100000', 'dataMax + 100000']} tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                    <Tooltip contentStyle={{ backgroundColor: "#080d0b", borderColor: "#506c64", borderRadius: "12px" }} formatter={(value: unknown) => [formatCurrency(Number(value) || 0), "Price"]} />
                    <Area type="monotone" dataKey="price" stroke="#a6ece0" strokeWidth={2} fillOpacity={1} fill="url(#priceGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            {player.stats && (
              <div className="p-6 grid grid-cols-3 gap-3 border-b border-[#506c64]/30 bg-[#0b110f]/50">
                <div className="bg-[#121916] p-3 rounded-xl border border-[#506c64]/20 text-center">
                  <p className="text-[10px] text-[#506c64] uppercase font-bold">Proj FPTS</p>
                  <p className="text-sm font-bold text-[#f0e9fe] mt-0.5">{player.stats.projected_fpts}</p>
                </div>
                <div className="bg-[#121916] p-3 rounded-xl border border-[#506c64]/20 text-center">
                  <p className="text-[10px] text-[#506c64] uppercase font-bold">Touchdowns</p>
                  <p className="text-sm font-bold text-[#f0e9fe] mt-0.5">{player.stats.touchdowns}</p>
                </div>
                <div className="bg-[#121916] p-3 rounded-xl border border-[#506c64]/20 text-center">
                  <p className="text-[10px] text-[#506c64] uppercase font-bold">{player.stats.primary_stat_label}</p>
                  <p className="text-sm font-bold text-[#f0e9fe] mt-0.5">{player.stats.primary_stat_value}</p>
                </div>
              </div>
            )}
            <div className="p-6 grid grid-cols-2 gap-3">
              <button onClick={() => { onClose(); onOpenTrade("BUY"); }} className="py-3 px-4 rounded-2xl bg-[#a6ece0] hover:bg-[#8cdccf] text-[#0b110f] font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all">
                <ShoppingBag size={16} /> Trade BUY
              </button>
              <button disabled={userOwnedShares <= 0} onClick={() => { onClose(); onOpenTrade("SELL"); }} className="py-3 px-4 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                <ArrowLeftRight size={16} /> Trade SELL
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

