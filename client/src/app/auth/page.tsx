"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Video,
  Lock,
  Mail,
  User as UserIcon,
  Check,
  Sparkles,
  Zap,
  ShieldCheck,
  ArrowRight,
  Shield,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { setToken, quickStartUser, API_BASE_URL, getToken } from "@/lib/api";

function AuthContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const redirectUrl = searchParams.get("redirect") || "/video";
  const initialMode = (searchParams.get("mode") as "login" | "register" | "guest") || "login";

  const [mode, setMode] = useState<"login" | "register" | "guest">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState("OTHER");
  const [age, setAge] = useState("21");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // If already authenticated, redirect straight to the destination
  useEffect(() => {
    const token = getToken();
    if (token) {
      window.location.href = redirectUrl;
    }
  }, [redirectUrl]);

  const getFeatureLabel = () => {
    if (redirectUrl.includes("video")) return "Video Chat";
    if (redirectUrl.includes("text")) return "Text Chat";
    if (redirectUrl.includes("dating")) return "Dating Discovery";
    if (redirectUrl.includes("messages")) return "Direct Messages";
    if (redirectUrl.includes("dashboard")) return "User Dashboard";
    if (redirectUrl.includes("settings")) return "Profile Settings";
    return "OmeglePlus";
  };

  const handleAuthComplete = (data: { token: string; user: any }) => {
    setToken(data.token);
    if (typeof window !== "undefined") {
      localStorage.setItem("omegle_user", JSON.stringify(data.user));
    }
    window.location.href = redirectUrl;
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
    setIsLoading(true);
    try {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const res = await quickStartUser({
        displayName: displayName.trim() || `User_${randomSuffix}`,
        gender,
        targetGender: "ANY",
        isAdult: true,
      });
      handleAuthComplete(res);
    } catch (err: any) {
      setError(err.message || "Failed to start guest session");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 my-6 sm:my-10">
      <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Top Header */}
        <div className="relative bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-6 sm:px-8 py-7 text-white text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-3">
            <Sparkles className="h-3.5 w-3.5" /> Authentication Required
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Sign In to Start {getFeatureLabel()}
          </h1>
          <p className="text-xs text-slate-300 mt-1.5 max-w-sm mx-auto">
            Please log in, register, or choose instant 1-click guest to start your session securely.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 p-1.5 gap-1.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer text-center ${
              mode === "login"
                ? "bg-white text-blue-700 shadow-sm border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer text-center ${
              mode === "register"
                ? "bg-white text-blue-700 shadow-sm border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => setMode("guest")}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
              mode === "guest"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-emerald-700 hover:text-emerald-900 bg-emerald-50/60"
            }`}
          >
            <Zap className="h-3 w-3" />
            <span>1-Click Guest</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 space-y-4">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-600 font-medium">
              {error}
            </div>
          )}

          {mode === "guest" ? (
            /* 1-Click Fast Guest Form */
            <div className="space-y-4">
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-900 space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-sm text-emerald-800">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Instant Guest Access
                </div>
                <p className="text-emerald-700 leading-relaxed text-xs">
                  Start interacting immediately! A secure guest profile will be created for you with 15 minutes introductory trial.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nickname (Optional)
                </label>
                <div className="relative flex items-center">
                  <UserIcon className="absolute left-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. Alex"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Your Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Age Confirmation
                  </label>
                  <div className="flex items-center h-[38px] px-3 rounded-xl border border-emerald-300 bg-emerald-50/50 text-xs font-bold text-emerald-800 gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>Strictly 18+</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleInstantGuest}
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    <span>Start {getFeatureLabel()} as Guest</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Login / Register Form */
            <form onSubmit={handleSubmit} className="space-y-4">
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
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-lg hover:shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>
                      {mode === "login"
                        ? `Sign In & Launch ${getFeatureLabel()}`
                        : `Create Account & Launch ${getFeatureLabel()}`}
                    </span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick toggle at bottom */}
          <div className="pt-2 text-center text-xs text-slate-600 border-t border-slate-100">
            {mode === "login" ? (
              <span>
                Need an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className="text-blue-600 font-bold hover:underline cursor-pointer"
                >
                  Sign up here
                </button>
                {" or "}
                <button
                  type="button"
                  onClick={() => setMode("guest")}
                  className="text-emerald-700 font-bold hover:underline cursor-pointer"
                >
                  quick guest start
                </button>
              </span>
            ) : mode === "register" ? (
              <span>
                Already registered?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-blue-600 font-bold hover:underline cursor-pointer"
                >
                  Sign in here
                </button>
              </span>
            ) : (
              <span>
                Prefer a permanent login?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-blue-600 font-bold hover:underline cursor-pointer"
                >
                  Sign in
                </button>
                {" or "}
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className="text-blue-600 font-bold hover:underline cursor-pointer"
                >
                  Create account
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <div className="min-h-[100dvh] w-full bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar />
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center p-12">
            <span className="h-8 w-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
          </div>
        }
      >
        <AuthContent />
      </Suspense>
    </div>
  );
}

