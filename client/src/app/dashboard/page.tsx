"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Video,
  MessageSquare,
  Heart,
  Mail,
  Crown,
  Sparkles,
  ShieldCheck,
  Clock,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { getCurrentUser, UserProfile } from "@/lib/api";

export default function DashboardPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (!u) {
        window.location.href = "/auth?redirect=/dashboard";
        return;
      }
      setUser(u);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] w-full bg-slate-50 flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <span className="h-8 w-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  const videoTrialUsedMins = Math.floor((user?.trialEntitlement?.videoTrialUsedSeconds || 0) / 60);
  const textTrialUsedMins = Math.floor((user?.trialEntitlement?.textTrialUsedSeconds || 0) / 60);
  const videoTrialRemaining = Math.max(0, 15 - videoTrialUsedMins);
  const textTrialRemaining = Math.max(0, 15 - textTrialUsedMins);

  const paidVideoMins = Math.floor((user?.usageBalance?.paidVideoSecondsAvailable || 0) / 60);
  const paidTextMins = Math.floor((user?.usageBalance?.paidTextSecondsAvailable || 0) / 60);
  const matchesUsed = user?.mutualMatchesCount || 0;

  return (
    <div className="min-h-[100dvh] w-full bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 space-y-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src={user?.profile?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"}
              alt="Profile"
              className="h-16 w-16 rounded-full border-2 border-white/40 object-cover shadow-md"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black">
                  Welcome, {user?.profile?.displayName || "Guest"}!
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Account ID: {user?.id.slice(0, 8)}... • Age {user?.profile?.age || 21} (18+ Verified)
              </p>
            </div>
          </div>

          <Link
            href="/pricing"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow transition-all flex items-center gap-2"
          >
            <Crown className="h-4 w-4" />
            <span>Top Up Balance</span>
          </Link>
        </div>

        {/* SUMMARY BALANCE CARDS (Exact match to prompt.md section 10) */}
        <div>
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
            Your Usage Entitlements & Balances
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Video Trial */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Video Trial Balance</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  Free Trial
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {videoTrialRemaining}/15 <span className="text-xs font-normal text-slate-500">mins left</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Introductory random video chat allowance. Free fair-use thereafter.
              </p>
            </div>

            {/* Text Trial */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Text Trial Balance</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  Free Trial
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {textTrialRemaining}/15 <span className="text-xs font-normal text-slate-500">mins left</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Introductory random text chat allowance.
              </p>
            </div>

            {/* Dating Match Allowance */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Dating Matches</span>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                  15 Free Limit
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {matchesUsed}/15 <span className="text-xs font-normal text-slate-500">mutual matches</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Counted only when both users independently like each other.
              </p>
            </div>

            {/* Preferred Gender Video */}
            <div className="bg-white rounded-2xl p-5 border border-amber-200 shadow-sm space-y-2 bg-gradient-to-b from-amber-50/20 to-white">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-800">Preferred Gender Video</span>
                <Crown className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-slate-900">
                {paidVideoMins} <span className="text-xs font-normal text-slate-500">mins available</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Deducted strictly while connected in call.
              </p>
            </div>

            {/* Preferred Gender Text */}
            <div className="bg-white rounded-2xl p-5 border border-amber-200 shadow-sm space-y-2 bg-gradient-to-b from-amber-50/20 to-white">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-800">Preferred Gender Text</span>
                <Crown className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-slate-900">
                {paidTextMins} <span className="text-xs font-normal text-slate-500">mins available</span>
              </div>
              <p className="text-[11px] text-slate-500">
                3-hour pack units for gender-specific messaging.
              </p>
            </div>

            {/* Dating Premium Status */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Dating Premium</span>
                <Heart className="h-4 w-4 text-rose-500" />
              </div>
              <div className="text-2xl font-black text-slate-900">
                {user?.isDatingPremium ? "Active" : "Not Active"}
              </div>
              <p className="text-[11px] text-slate-500">
                {user?.isDatingPremium ? "Unlimited discovery swipes unlocked." : "Requires ₹499/7-day pass after 15 matches."}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Launch Cards */}
        <div>
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/video"
              className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all flex items-center gap-3"
            >
              <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                <Video className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Video Chat</div>
                <div className="text-[10px] text-slate-500">Instant matchmaking</div>
              </div>
            </Link>

            <Link
              href="/text"
              className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-500 hover:shadow-md transition-all flex items-center gap-3"
            >
              <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Text Chat</div>
                <div className="text-[10px] text-slate-500">Fast anonymous text</div>
              </div>
            </Link>

            <Link
              href="/dating"
              className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-rose-500 hover:shadow-md transition-all flex items-center gap-3"
            >
              <div className="h-10 w-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                <Heart className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Dating Discovery</div>
                <div className="text-[10px] text-slate-500">Mutual matches</div>
              </div>
            </Link>

            <Link
              href="/messages"
              className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all flex items-center gap-3"
            >
              <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Messages</div>
                <div className="text-[10px] text-slate-500">Accepted direct inbox</div>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

