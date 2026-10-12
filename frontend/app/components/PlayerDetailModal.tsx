"use client";
import { useEffect, useState } from "react";
import { fetchPlayerDetail, PlayerDetail, GameLogEntry } from "../lib/api";
import { X, ShoppingBag, ArrowLeftRight, User as UserIcon } from "lucide-react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
type Tab = "market" | "stats" | "gamelog";
interface Props { isOpen: boolean; onClose: () => void; playerId: string | null; userOwnedShares: number; onOpenTrade: (s: "BUY" | "SELL") => void; }
export default function PlayerDetailModal(props: Props) {
  const { isOpen, onClose, playerId, userOwnedShares, onOpenTrade } = props;
  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("market");
  const [tf, setTf] = useState<"season" | "weekly">("season");
  const [expanded, setExpanded] = useState<string[]>([]);
  useEffect(() => { if (isOpen && playerId) { setLoading(true); fetchPlayerDetail(playerId).then((d) => { setPlayer(d); if (d.game_logs?.length) setExpanded([d.game_logs[0].season]); }).catch(console.error).finally(() => setLoading(false)); } }, [isOpen, playerId]);
  if (!isOpen || !playerId) return null;
  const fmt$ = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
  const fmtDT = (ts: string) => { const d = new Date(ts); return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ", " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }); };
  const fmtH = (h?: string) => { if (!h) return "-"; const s = String(h).trim(); if (s.includes("'")) return s; const m = s.match(/(\d+)\s*ft\s*(\d+)?/i); if (m) return `${m[1]}'${m[2] ?? 0}"`; const n = parseInt(s, 10); return !isNaN(n) && n > 0 && n < 120 ? `${Math.floor(n / 12)}'${n % 12}"` : s; };
  const fmtS = (v?: number) => { if (v === undefined || v === null) return "0"; return tf === "weekly" ? Number(v).toFixed(1) : String(Math.round(Number(v))); };
  const chartData = player?.price_history.map((pt) => ({ time: fmtDT(pt.timestamp), price: pt.price })) || [];
  const cur = tf === "season" ? player?.season_actual_stats : player?.weekly_projected_stats;
  const wk = player?.current_week ?? 1;
  const isQB = player?.position === "QB";
  const bio = player?.bio; const own = player?.ownership; const rk = player?.rankings;
  const grouped: Record<string, GameLogEntry[]> = {};
  (player?.game_logs || []).forEach((l) => { const k = l.season || "2026"; if (!grouped[k]) grouped[k] = []; grouped[k].push(l); });
  const seasons = Object.keys(grouped).sort((a, b) => Number(b) - Number(a));
  const toggle = (s: string) => setExpanded((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));
  return (<div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md"><div className="bg-[#121916] border border-[#506c64]/40 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative text-[#f0e9fe]">
    <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2 rounded-full bg-[#080d0b]/80 text-[#506c64] hover:text-[#f0e9fe]"><X size={18} /></button>
    {loading ? (<div className="p-16 text-center text-[#506c64] text-sm animate-pulse">Loading player context...</div>) : player ? (<div className="flex flex-col h-full overflow-y-auto">
      <div className="p-5 border-b border-[#506c64]/30 shrink-0"><div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-[#080d0b] border border-[#506c64]/40 overflow-hidden shrink-0 flex items-center justify-center">
          {player.headshot_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={player.headshot_url} alt={player.name} className="w-full h-full object-cover" />
          ) : (<UserIcon className="text-[#506c64]" size={28} />)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#a6ece0]/10 text-[#a6ece0] border border-[#a6ece0]/30">{player.position} • {player.team} {bio?.number ? `#${bio.number}` : ""}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">{bio?.status || "Active"}</span>
          </div>
          <h2 className="text-xl font-black mt-1 truncate">{player.name}</h2>
          <p className="text-2xl font-black font-mono text-[#f0f3bd]">{fmt$(player.current_price)}</p>
        </div>
      </div>
      {bio && (<div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-[#506c64]/20 text-center text-[10px] text-[#506c64]">
        <div><span className="block uppercase">Age | Exp</span><span className="font-bold text-[#f0e9fe]">{bio.age ?? "-"} | {bio.years_exp ?? "R"}y</span></div>
        <div><span className="block uppercase">Height | Weight</span><span className="font-bold text-[#f0e9fe]">{fmtH(bio.height)} | {bio.weight ?? "-"} lbs</span></div>
        <div className="col-span-2 truncate"><span className="block uppercase">College</span><span className="font-bold text-[#f0e9fe]">{bio.college ?? "-"}</span></div>
      </div>)}
      </div>
      <div className="grid grid-cols-3 bg-[#0b110f] border-b border-[#506c64]/30 shrink-0">
        {(["market", "stats", "gamelog"] as Tab[]).map((t) => (<button key={t} onClick={() => setTab(t)} className={`py-3 text-xs font-bold transition-all border-b-2 ${tab === t ? "border-[#a6ece0] text-[#a6ece0] bg-[#121916]" : "border-transparent text-[#506c64] hover:text-[#f0e9fe]"}`}>{t === "market" ? "Market & Value" : t === "stats" ? "Stats & Projections" : "Game Log"}</button>))}
      </div>
      <div className="p-5 flex-1 space-y-5">
        {tab === "market" && (<div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2"><span className="text-xs font-bold text-[#506c64] uppercase">Price History Trend</span>{userOwnedShares > 0 && (<span className="text-xs font-bold text-[#a6ece0]">You Own: {userOwnedShares} SH</span>)}</div>
            <div className="h-44 w-full bg-[#080d0b] rounded-2xl p-2 border border-[#506c64]/20">
              <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}>
                <defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a6ece0" stopOpacity={0.3} /><stop offset="95%" stopColor="#a6ece0" stopOpacity={0} /></linearGradient></defs>
                <XAxis dataKey="time" stroke="#506c64" fontSize={9} tickLine={false} />
                <YAxis stroke="#506c64" fontSize={9} tickLine={false} domain={['dataMin - 100000', 'dataMax + 100000']} tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                <Tooltip contentStyle={{ backgroundColor: "#080d0b", borderColor: "#506c64", borderRadius: "12px" }} formatter={(value: unknown) => [fmt$(Number(value) || 0), "Spot Price"]} />
                <Area type="monotone" dataKey="price" stroke="#a6ece0" strokeWidth={2} fillOpacity={1} fill="url(#pg)" />
              </AreaChart></ResponsiveContainer>
            </div>
          </div>
          {own && (<div className="bg-[#0b110f] border border-[#506c64]/30 rounded-2xl p-4">
            <h3 className="text-xs font-bold text-[#a6ece0] uppercase mb-3">Platform Ownership</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-[#121916] p-2.5 rounded-xl border border-[#506c64]/20"><p className="text-[10px] text-[#506c64] uppercase font-bold">Total Shares</p><p className="text-sm font-bold font-mono mt-0.5">{own.total_shares_outstanding}</p></div>
              <div className="bg-[#121916] p-2.5 rounded-xl border border-[#506c64]/20"><p className="text-[10px] text-[#506c64] uppercase font-bold"># of Owners</p><p className="text-sm font-bold mt-0.5">{own.platform_user_holders}</p></div>
              <div className="bg-[#121916] p-2.5 rounded-xl border border-[#506c64]/20"><p className="text-[10px] text-[#506c64] uppercase font-bold">Percentage</p><p className="text-sm font-bold font-mono mt-0.5">{own.platform_ownership_pct}%</p></div>
            </div>
          </div>)}
          {rk && (<div className="bg-[#0b110f] border border-[#506c64]/30 rounded-2xl p-4">
            <h3 className="text-xs font-bold text-[#a6ece0] uppercase mb-3">Market & Value Ranks</h3>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-[#121916] p-3 rounded-xl border border-[#506c64]/20 flex justify-between"><span className="text-xs text-[#506c64]">Fantasy Points</span><span className="text-xs font-bold font-mono">#{rk.fpts_rank}</span></div>
              <div className="bg-[#121916] p-3 rounded-xl border border-[#506c64]/20 flex justify-between"><span className="text-xs text-[#506c64]">Most Owned</span><span className="text-xs font-bold font-mono">#{rk.ownership_rank}</span></div>
              <div className="bg-[#121916] p-3 rounded-xl border border-[#506c64]/20 flex justify-between"><span className="text-xs text-[#506c64]">Season Points/Price</span><span className="text-xs font-bold font-mono">#{rk.value_rank}</span></div>
              <div className="bg-[#121916] p-3 rounded-xl border border-[#506c64]/20 flex justify-between"><span className="text-xs text-[#506c64]">Projected Points/Price</span><span className="text-xs font-bold font-mono">#{rk.proj_value_rank}</span></div>
            </div>
          </div>)}
        </div>)}
        {tab === "stats" && (<div className="space-y-4">
          <div className="flex bg-[#0b110f] p-1.5 rounded-2xl border border-[#506c64]/30 gap-1.5">
            <button onClick={() => setTf("season")} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-300 border-2 ${tf === "season" ? "bg-[#a6ece0]/10 border-[#a6ece0]/50 text-[#a6ece0] shadow-[0_0_15px_rgba(166,236,224,0.1)]" : "border-transparent text-[#506c64] hover:bg-[#506c64]/10"}`}>Season Stats</button>
            <button onClick={() => setTf("weekly")} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-300 border-2 ${tf === "weekly" ? "bg-[#a6ece0]/10 border-[#a6ece0]/50 text-[#a6ece0] shadow-[0_0_15px_rgba(166,236,224,0.1)]" : "border-transparent text-[#506c64] hover:bg-[#506c64]/10"}`}>Week {wk} Projection</button>
          </div>
          {cur && (<div className="bg-[#0b110f] border border-[#a6ece0]/30 rounded-2xl p-4 flex items-center justify-between"><div><p className="text-[10px] text-[#506c64] uppercase font-bold">{tf === "season" ? "Season Total PPR Points" : `Projected Week ${wk} PPR Points`}</p><p className="text-2xl font-black text-[#f0e9fe] font-mono mt-0.5">{fmtS(cur.pts_ppr)}</p></div><span className="text-xs font-bold px-3 py-1 rounded-full bg-[#a6ece0]/10 text-[#a6ece0] border border-[#a6ece0]/30">Full PPR</span></div>)}
          {cur && (<div className="space-y-3">
            {(cur.pass_att > 0 || isQB) && (<div className="bg-[#0b110f] p-3.5 rounded-2xl border border-[#506c64]/30"><p className="text-xs font-bold text-[#a6ece0] uppercase mb-2">Passing</p><div className="grid grid-cols-4 gap-2 text-center text-xs"><div><span className="text-[10px] text-[#506c64] block">Completions/Attempts</span><span className="font-bold">{fmtS(cur.pass_cmp)}/{fmtS(cur.pass_att)}</span></div><div><span className="text-[10px] text-[#506c64] block">Yards</span><span className="font-bold">{fmtS(cur.pass_yd)}</span></div><div><span className="text-[10px] text-[#506c64] block">TDs</span><span className="font-bold text-[#f0e9fe]">{fmtS(cur.pass_td)}</span></div><div><span className="text-[10px] text-[#506c64] block">INTs</span><span className="font-bold text-rose-400">{fmtS(cur.pass_int)}</span></div></div></div>)}
            <div className="bg-[#0b110f] p-3.5 rounded-2xl border border-[#506c64]/30"><p className="text-xs font-bold text-[#a6ece0] uppercase mb-2">Rushing</p><div className="grid grid-cols-3 gap-2 text-center text-xs"><div><span className="text-[10px] text-[#506c64] block">Carries</span><span className="font-bold">{fmtS(cur.rush_att)}</span></div><div><span className="text-[10px] text-[#506c64] block">Yards</span><span className="font-bold">{fmtS(cur.rush_yd)}</span></div><div><span className="text-[10px] text-[#506c64] block">TDs</span><span className="font-bold text-[#f0e9fe]">{fmtS(cur.rush_td)}</span></div></div></div>
            {(!isQB || (cur.rec_target || 0) > 0) && (<div className="bg-[#0b110f] p-3.5 rounded-2xl border border-[#506c64]/30"><p className="text-xs font-bold text-[#a6ece0] uppercase mb-2">Receiving</p><div className="grid grid-cols-4 gap-2 text-center text-xs"><div><span className="text-[10px] text-[#506c64] block">Targets</span><span className="font-bold">{fmtS(cur.rec_target)}</span></div><div><span className="text-[10px] text-[#506c64] block">Receptions</span><span className="font-bold">{fmtS(cur.rec)}</span></div><div><span className="text-[10px] text-[#506c64] block">Yards</span><span className="font-bold">{fmtS(cur.rec_yd)}</span></div><div><span className="text-[10px] text-[#506c64] block">TDs</span><span className="font-bold text-[#f0e9fe]">{fmtS(cur.rec_td)}</span></div></div></div>)}
          </div>)}
          <hr className="border-[#506c64]/30 my-6" />
          {player.past_seasons && player.past_seasons.length > 0 && (<div className="bg-[#0b110f] p-3.5 rounded-2xl border border-[#506c64]/30 overflow-x-auto">
            <p className="text-xs font-bold text-[#a6ece0] uppercase mb-3">Career Summary</p>
            <table className="w-full text-xs text-left min-w-max"><thead><tr className="text-[#506c64] border-b border-[#506c64]/20 uppercase"><th className="py-1">YEAR</th><th className="px-2">TM</th><th className="px-2">GP</th>{isQB ? (<><th className="px-2">PASSING</th><th className="px-2">RUSHING</th></>) : (<><th className="px-2">RUSHING</th><th className="px-2">RECEIVING</th></>)}<th className="text-right">FPTS</th></tr></thead>
            <tbody className="divide-y divide-[#506c64]/10">{player.past_seasons.map((ps) => {
              const p = (val: number | undefined, singular: string, plural: string = singular + "s") => { const v = val || 0; return `${v} ${v === 1 ? singular : plural}`; };
              return (<tr key={ps.season} className="hover:bg-[#121916]/50"><td className="py-2 font-bold">{ps.season}</td><td className="px-2">{ps.team}</td><td className="px-2">{ps.games_played}</td>{isQB ? (<><td className="px-2 text-[#f0e9fe]">{ps.pass_cmp}/{ps.pass_att} completions, {p(ps.pass_yd, "yard")}, {p(ps.pass_td, "TD")}, {p(ps.pass_int, "INT")}</td><td className="px-2 text-[#f0e9fe]">{p(ps.rush_att, "carry", "carries")}, {p(ps.rush_yd, "yard")}, {p(ps.rush_td, "TD")}</td></>) : (<><td className="px-2 text-[#f0e9fe]">{p(ps.rush_att, "carry", "carries")}, {p(ps.rush_yd, "yard")}, {p(ps.rush_td, "TD")}</td><td className="px-2 text-[#f0e9fe]">{p(ps.rec_target, "target")}, {p(ps.rec, "reception")}, {p(ps.rec_yd, "yard")}, {p(ps.rec_td, "TD")}</td></>)}<td className="text-right font-mono font-bold text-[#f0e9fe]">{ps.pts_ppr}</td></tr>);
            })}</tbody></table>
          </div>)}
        </div>)}
        {tab === "gamelog" && (<div className="space-y-4">
          {seasons.length === 0 ? (<div className="bg-[#0b110f] border border-dashed border-[#506c64]/40 rounded-2xl p-6 text-center text-[#506c64] text-xs">No game statistics recorded yet.</div>) : seasons.map((season) => {
            const open = expanded.includes(season);
            return (<div key={season} className="bg-[#0b110f] border border-[#506c64]/30 rounded-2xl overflow-hidden">
              <button onClick={() => toggle(season)} className="w-full flex items-center justify-between p-3.5 bg-[#121916] hover:bg-[#1a2521] transition-colors">
                <span className="text-xs font-bold text-[#a6ece0] uppercase">{season} Season</span>
                {open ? <ChevronUp size={16} className="text-[#506c64]" /> : <ChevronDown size={16} className="text-[#506c64]" />}
              </button>
              {open && (<div className="overflow-x-auto"><table className="w-full text-xs text-left min-w-max">
                <thead className="bg-[#080d0b] text-[#506c64] border-y border-[#506c64]/30 uppercase"><tr><th className="p-2.5">Week</th><th className="p-2.5">Opponent</th>{isQB && <th className="p-2.5">Passing</th>}<th className="p-2.5">Rushing</th>{!isQB && <th className="p-2.5">Receiving</th>}<th className="p-2.5 text-right">FPTS</th></tr></thead>
                <tbody className="divide-y divide-[#506c64]/10">{grouped[season].map((gl) => {
                  const p = (val: number | undefined, singular: string, plural: string = singular + "s") => { const v = val || 0; return `${v} ${v === 1 ? singular : plural}`; };
                  const passParts: string[] = [];
                  if (gl.pass_yd) passParts.push(p(gl.pass_yd, "yard"));
                  if (gl.pass_td) passParts.push(p(gl.pass_td, "TD"));
                  if (!passParts.length && (gl.pass_cmp || gl.pass_att)) passParts.push(`${gl.pass_cmp}/${gl.pass_att} completions`);
                  const rushParts: string[] = [];
                  if (gl.rush_att) rushParts.push(p(gl.rush_att, "carry", "carries"));
                  if (gl.rush_yd) rushParts.push(p(gl.rush_yd, "yard"));
                  if (gl.rush_td) rushParts.push(p(gl.rush_td, "TD"));
                  const recParts: string[] = [];
                  if (gl.rec_target) recParts.push(p(gl.rec_target, "target"));
                  if (gl.rec) recParts.push(p(gl.rec, "reception"));
                  if (gl.rec_yd) recParts.push(p(gl.rec_yd, "yard"));
                  if (gl.rec_td) recParts.push(p(gl.rec_td, "TD"));
                  return (<tr key={gl.week} className="hover:bg-[#121916]/50"><td className="p-2.5 font-bold">{gl.week}</td><td className="p-2.5 text-[#f0e9fe] font-medium">{gl.opponent || "-"}</td>{isQB && <td className="p-2.5">{passParts.join(", ")}</td>}<td className="p-2.5">{rushParts.join(", ")}</td>{!isQB && <td className="p-2.5">{recParts.join(", ")}</td>}<td className="p-2.5 text-right font-mono font-bold text-[#f0f3bd]">{gl.pts_ppr}</td></tr>);
                })}</tbody>
              </table></div>)}
            </div>);
          })}
        </div>)}

      </div>
      <div className="p-4 bg-[#0b110f] border-t border-[#506c64]/30 grid grid-cols-2 gap-3 shrink-0">
        <button onClick={() => { onClose(); onOpenTrade("BUY"); }} className="py-3 px-4 rounded-2xl bg-[#a6ece0] text-[#0b110f] font-bold text-sm flex items-center justify-center gap-2"><ShoppingBag size={16} /> Trade BUY</button>
        <button disabled={userOwnedShares <= 0} onClick={() => { onClose(); onOpenTrade("SELL"); }} className="py-3 px-4 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-30"><ArrowLeftRight size={16} /> Trade SELL</button>
      </div>
    </div>) : null}
  </div></div>);
}
