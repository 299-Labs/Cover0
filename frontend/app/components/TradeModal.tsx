"use client";

import { useState, useEffect, useCallback } from "react";
import { Player, previewTrade, executeTrade, TradePreviewResponse } from "../lib/api";
import { X, TrendingUp, TrendingDown } from "lucide-react";

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  userId: string;
  userCashBalance: number;
  userOwnedShares?: number;
  initialSide?: "BUY" | "SELL";
  onSuccess: () => void;
}

export default function TradeModal({
  isOpen,
  onClose,
  player,
  userId,
  userCashBalance,
  userOwnedShares = 0,
  initialSide = "BUY",
  onSuccess,
}: TradeModalProps) {
  const [side, setSide] = useState<"BUY" | "SELL">(initialSide);
  const [shares, setShares] = useState("1");
  const [preview, setPreview] = useState<TradePreviewResponse | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSide(initialSide);
    setShares("1");
    setPreview(null);
    setError(null);
  }, [initialSide, player, isOpen]);

  const numShares = parseFloat(shares) || 0;

  const loadPreview = useCallback(async () => {
    if (!player || numShares <= 0) {
      setPreview(null);
      return;
    }

    setLoadingPreview(true);
    setError(null);

    try {
      const data = await previewTrade({
        user_id: userId,
        player_id: player.id,
        side,
        shares: numShares,
      });
      setPreview(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Preview error";
      setError(msg);
      setPreview(null);
    } finally {
      setLoadingPreview(false);
    }
  }, [player, userId, side, numShares]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      loadPreview();
    }, 300);
    return () => clearTimeout(timer);
  }, [shares, side, isOpen, loadPreview]);

  if (!isOpen || !player) return null;

  const formatCurrency = (val: number | string) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(Number(val) || 0);

  const handlePreset = (percent: number) => {
    if (side === "SELL") {
      setShares((Number(userOwnedShares) * percent).toFixed(2));
    } else {
      const cash = Number(userCashBalance) || 0;
      const price = Number(player.current_price) || 0;
      const approxMax = price > 0 ? cash / price : 0;
      setShares((approxMax * percent).toFixed(2));
    }
  };

  const handleConfirmTrade = async () => {
    if (numShares <= 0) return;
    setExecuting(true);
    setError(null);

    try {
      await executeTrade({
        user_id: userId,
        player_id: player.id,
        side,
        shares: numShares,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Execution error";
      setError(msg);
    } finally {
      setExecuting(false);
    }
  };

  const priceImpact = preview ? Number(preview.price_impact_percent) : 0;
  const safePriceImpact = Number.isFinite(priceImpact) ? priceImpact : 0;

  const priceImpactColor =
    !preview || safePriceImpact === 0
      ? "text-[#506c64]"
      : safePriceImpact > 0
        ? "text-[#a6ece0]"
        : "text-rose-400";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#0b110f]/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-[#121916] border border-[#506c64]/40 rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto text-[#f0e9fe] shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-xl font-black tracking-tight text-[#f0e9fe]">{player.name}</h2>
            <p className="text-xs text-[#506c64] font-medium mt-0.5">
              {player.position} • {player.team}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-[#0b110f] border border-[#506c64]/30 hover:bg-[#506c64]/20 text-[#506c64] hover:text-[#f0e9fe] transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Player Market Summary Card */}
        <div className="my-4 grid grid-cols-2 gap-3">
          <div className="bg-[#0b110f] p-3 rounded-2xl border border-[#506c64]/30">
            <div className="text-[#506c64] text-[10px] font-bold uppercase tracking-wider">
              Circulating Supply
            </div>
            <p className="text-sm font-bold font-mono text-[#f0e9fe] mt-1">
              {player.total_shares_outstanding} shares
            </p>
          </div>

          <div className="bg-[#0b110f] p-3 rounded-2xl border border-[#506c64]/30">
            <div className="text-[#506c64] text-[10px] font-bold uppercase tracking-wider">
              Your Holdings
            </div>
            <p className="text-sm font-bold font-mono text-[#a6ece0] mt-1">
              {userOwnedShares} shares
            </p>
          </div>
        </div>

        {/* Side Selector */}
        <div className="grid grid-cols-2 gap-2 bg-[#0b110f] border border-[#506c64]/30 rounded-2xl p-1.5 mb-5">
          <button
            onClick={() => setSide("BUY")}
            className={`py-2.5 text-xs font-bold rounded-xl transition-all ${
              side === "BUY"
                ? "bg-[#a6ece0] text-[#0b110f] font-black shadow-lg shadow-[#a6ece0]/10"
                : "text-[#506c64] hover:text-[#f0e9fe]"
            }`}
          >
            BUY
          </button>
          <button
            onClick={() => setSide("SELL")}
            className={`py-2.5 text-xs font-bold rounded-xl transition-all ${
              side === "SELL"
                ? "bg-rose-500 text-white font-black shadow-lg shadow-rose-500/20"
                : "text-[#506c64] hover:text-[#f0e9fe]"
            }`}
          >
            SELL
          </button>
        </div>

        {/* Shares Input & Presets */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#506c64]">
              Shares Quantity
            </label>
            <span className="text-xs text-[#f0f3bd]">
              {side === "BUY"
                ? `Available: ${formatCurrency(userCashBalance)}`
                : `Owned: ${userOwnedShares} shares`}
            </span>
          </div>
          <input
            type="number"
            min="0"
            step="0.01"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            placeholder="0.00"
            className="w-full bg-[#0b110f] border border-[#506c64]/30 rounded-2xl px-4 py-3 text-lg font-bold text-[#f0f3bd] focus:outline-none focus:border-[#a6ece0]/50 transition-all font-mono"
          />
          <div className="grid grid-cols-3 gap-2 mt-2">
            {[0.25, 0.5, 1.0].map((p) => (
              <button
                key={p}
                onClick={() => handlePreset(p)}
                className="py-1.5 text-xs font-bold bg-[#0b110f] hover:bg-[#506c64]/20 border border-[#506c64]/30 text-[#a6ece0] rounded-xl transition-colors"
              >
                {p === 1.0 ? "MAX" : `${p * 100}%`}
              </button>
            ))}
          </div>
        </div>

        {/* AMM Execution Preview Card */}
        <div className="bg-[#0b110f] border border-[#506c64]/30 rounded-2xl p-4 mb-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#506c64]">Spot Price</span>
            <span className="font-bold font-mono text-[#f0f3bd]">{formatCurrency(player.current_price)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#506c64]">Estimated Execution Price</span>
            <span className="font-bold font-mono text-[#f0f3bd]">
              {loadingPreview
                ? "Calculating..."
                : preview
                  ? formatCurrency(preview.execution_price)
                  : "--"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#506c64]">Price Impact</span>
            <span className={`font-bold font-mono flex items-center gap-1 ${priceImpactColor}`}>
              {loadingPreview ? (
                "..."
              ) : preview ? (
                <>
                  {safePriceImpact > 0 ? (
                    <TrendingUp size={14} />
                  ) : safePriceImpact < 0 ? (
                    <TrendingDown size={14} />
                  ) : null}
                  {safePriceImpact.toFixed(2)}%
                </>
              ) : (
                "--"
              )}
            </span>
          </div>
          <div className="h-px bg-[#506c64]/30" />
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-[#a6ece0]">
              {side === "BUY" ? "Total Cost" : "Total Proceeds"}
            </span>
            <span className="font-black font-mono text-base text-[#f0f3bd]">
              {loadingPreview ? "..." : preview ? formatCurrency(preview.total_amount) : "--"}
            </span>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-2xl p-3 mb-4 text-sm font-medium text-center">
            {error}
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleConfirmTrade}
          disabled={executing || loadingPreview || numShares <= 0 || !preview}
          className={`w-full py-3.5 rounded-2xl text-sm font-black transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed ${
            side === "BUY"
              ? "bg-[#a6ece0] hover:bg-[#a6ece0]/90 text-[#0b110f]"
              : "bg-rose-500 hover:bg-rose-400 text-white"
          }`}
        >
          {executing ? "Executing Trade..." : `Confirm ${side} (${numShares} Shares)`}
        </button>
      </div>
    </div>
  );
}