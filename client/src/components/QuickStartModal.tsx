"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Sparkles, ShieldCheck, Video, MessageSquare, Check } from "lucide-react";
import { quickStartUser } from "@/lib/api";
import { useRouter } from "next/navigation";

interface QuickStartModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: "video" | "text";
  onSuccess?: (user: any) => void;
}

export default function QuickStartModal({
  isOpen,
  onClose,
  defaultMode = "video",
  onSuccess,
}: QuickStartModalProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState("MALE");
  const [targetGender, setTargetGender] = useState("ANY");
  const [isAdult, setIsAdult] = useState(true);
  const [targetAction, setTargetAction] = useState<"video" | "text">(defaultMode);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdult) {
      setError("You must be 18 years or older to access this platform.");
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const res = await quickStartUser({
        displayName: displayName.trim() || undefined,
        gender,
        targetGender,
        isAdult: true,
      });

      if (onSuccess) onSuccess(res.user);
      onClose();

      // Navigate to selected experience
      if (targetAction === "video") {
        router.push("/video");
      } else {
        router.push("/text");
      }
    } catch (err: any) {
      setError(err.message || "Failed to initialize session");
    } finally {
      setIsLoading(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain bg-slate-950/75 backdrop-blur-sm p-4 sm:p-6 flex items-start sm:items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-6 py-6 text-white">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-4 right-4 z-20 flex items-center justify-center h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-2">
            <Sparkles className="h-3.5 w-3.5" /> Fast 1-Click Entry
          </div>
          <h2 className="text-xl font-bold tracking-tight">Welcome to OmeglePlus</h2>
          <p className="text-xs text-slate-300 mt-1">
            Zero sign-up barrier. Free random video & text chats with 1-click.
          </p>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-600 font-medium">
              {error}
            </div>
          )}

          {/* Nickname */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Your Nickname / Display Name
            </label>
            <input
              type="text"
              placeholder="e.g. Alex (or leave blank for random)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Your Gender */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Your Gender
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: "MALE", label: "Male" },
                { val: "FEMALE", label: "Female" },
                { val: "OTHER", label: "Other" },
              ].map((g) => (
                <button
                  type="button"
                  key={g.val}
                  onClick={() => setGender(g.val)}
                  className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                    gender === g.val
                      ? "border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-500"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Target Preference */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Matching Preference
              </label>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Random is Free Forever
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTargetGender("ANY")}
                className={`py-2 px-2 rounded-xl text-xs font-semibold border text-center transition-all ${
                  targetGender === "ANY"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div>Anyone</div>
                <div className="text-[10px] text-emerald-600 font-bold">100% Free</div>
              </button>
              <button
                type="button"
                onClick={() => setTargetGender("FEMALE")}
                className={`py-2 px-2 rounded-xl text-xs font-semibold border text-center transition-all ${
                  targetGender === "FEMALE"
                    ? "border-amber-500 bg-amber-50 text-amber-900 ring-1 ring-amber-500"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div>Female</div>
                <div className="text-[10px] text-amber-700 font-medium">Premium Filter</div>
              </button>
              <button
                type="button"
                onClick={() => setTargetGender("MALE")}
                className={`py-2 px-2 rounded-xl text-xs font-semibold border text-center transition-all ${
                  targetGender === "MALE"
                    ? "border-amber-500 bg-amber-50 text-amber-900 ring-1 ring-amber-500"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div>Male</div>
                <div className="text-[10px] text-amber-700 font-medium">Premium Filter</div>
              </button>
            </div>
          </div>

          {/* Action Choice */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Launch Directly Into
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTargetAction("video")}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all ${
                  targetAction === "video"
                    ? "border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-500"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Video className="h-4 w-4 text-blue-600" />
                Video Chat
              </button>
              <button
                type="button"
                onClick={() => setTargetAction("text")}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all ${
                  targetAction === "text"
                    ? "border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-500"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <MessageSquare className="h-4 w-4 text-indigo-600" />
                Text Chat
              </button>
            </div>
          </div>

          {/* 18+ Verification */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isAdult}
                onChange={(e) => setIsAdult(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-700 leading-snug">
                <strong>I am 18 years or older</strong>, agree to community safety guidelines, and understand all random chats are moderated for safety.
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !isAdult}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm shadow-md hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>Start {targetAction === "video" ? "Free Video Call" : "Free Text Chat"}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

