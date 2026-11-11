"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Mail, Lock, User as UserIcon, Check, Sparkles, Zap, ShieldCheck } from "lucide-react";
import { setToken, quickStartUser, API_BASE_URL } from "@/lib/api";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  mode?: "login" | "register";
  redirectUrl?: string;
  featureTitle?: string;
}

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  mode: initialMode = "login",
  redirectUrl,
  featureTitle,
}: AuthModalProps) {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState("OTHER");
  const [age, setAge] = useState("21");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);

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

  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode, isOpen]);

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

  const handleAuthComplete = (data: { token: string; user: any }) => {
    setToken(data.token);
    if (typeof window !== "undefined") {
      localStorage.setItem("omegle_user", JSON.stringify(data.user));
    }
    if (onSuccess) onSuccess();
    onClose();

    if (redirectUrl) {
      window.location.href = redirectUrl;
    } else {
      window.location.reload();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        mode === "login"
          ? { email, password }
          : { email, password, displayName, gender, age: Number(age) };

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      handleAuthComplete(data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstantGuest = async () => {
    setError(null);
    setIsGuestLoading(true);
    try {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const res = await quickStartUser({
        displayName: `User_${randomSuffix}`,
        gender: "OTHER",
        targetGender: "ANY",
        isAdult: true,
      });
      handleAuthComplete(res);
    } catch (err: any) {
      setError(err.message || "Failed to start guest session");
    } finally {
      setIsGuestLoading(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain bg-slate-950/75 backdrop-blur-sm p-4 sm:p-6 flex items-start sm:items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
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

          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-2">
            <Sparkles className="h-3 w-3" />
            {featureTitle ? `Access ${featureTitle}` : "Account Access"}
          </div>

          <h2 className="text-xl font-bold tracking-tight">
            {featureTitle
              ? `Sign In to start ${featureTitle}`
              : mode === "login"
              ? "Sign In to OmeglePlus"
              : "Create Permanent Account"}
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            {featureTitle
              ? "Please authenticate to start your session."
              : mode === "login"
              ? "Access your saved purchases, dating matches, and private chats."
              : "Register to save your minutes, preferences, and conversations permanently."}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-600 font-medium">
              {error}
            </div>
          )}

          {mode === "register" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Display Name
              </label>
              <div className="relative flex items-center">
                <UserIcon className="absolute left-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Morgan"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 h-4 w-4 text-slate-400" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {mode === "register" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Age (18+)
                </label>
                <input
                  type="number"
                  min="18"
                  max="99"
                  required
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || isGuestLoading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>{mode === "login" ? "Sign In & Start" : "Register & Start"}</span>
              </>
            )}
          </button>

          <div className="relative my-3 flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-2 text-[10px] uppercase font-bold text-slate-400 absolute">
              or
            </span>
          </div>

          <button
            type="button"
            onClick={handleInstantGuest}
            disabled={isLoading || isGuestLoading}
            className="w-full py-2.5 rounded-xl border-2 border-emerald-500 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
          >
            {isGuestLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            ) : (
              <>
                <Zap className="h-4 w-4 text-emerald-600" />
                <span>Instant 1-Click Guest Start (18+)</span>
              </>
            )}
          </button>

          <div className="pt-2 text-center text-xs text-slate-600">
            {mode === "login" ? (
              <span>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className="text-blue-600 font-bold hover:underline cursor-pointer"
                >
                  Create one here
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-blue-600 font-bold hover:underline cursor-pointer"
                >
                  Sign in here
                </button>
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
