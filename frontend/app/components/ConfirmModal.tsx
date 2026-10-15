"use client";

import { AlertTriangle, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "default";
  loading?: boolean;
  error?: string | null;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  loading = false,
  error = null,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const isDanger = variant === "danger";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-[#121916] border border-[#506c64]/40 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 text-[#506c64] hover:text-[#f0e9fe] transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${
              isDanger
                ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                : "bg-[#a6ece0]/10 border-[#a6ece0]/30 text-[#a6ece0]"
            }`}
          >
            <AlertTriangle size={18} />
          </div>
          <h3 className="text-base font-black text-[#f0e9fe]">{title}</h3>
        </div>

        <p className="text-xs text-[#506c64] leading-relaxed my-3 pl-12">{description}</p>

        {error && (
          <div className="mt-3 mb-2 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl p-3 text-xs font-medium">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-bold text-[#506c64] hover:text-[#f0e9fe] transition-all cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md cursor-pointer ${
              isDanger
                ? "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40"
                : "bg-[#a6ece0] text-[#080d0b] hover:bg-[#a6ece0]/90"
            }`}
          >
            {loading ? "Deleting..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
