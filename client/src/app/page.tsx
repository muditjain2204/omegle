"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Video,
  MessageSquare,
  Heart,
  Crown,
  ShieldCheck,
  Zap,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Users,
  Lock,
  Volume2,
  Mic,
  PhoneOff,
  Maximize2,
  Smile,
  Send,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import QuickStartModal from "@/components/QuickStartModal";
import PricingModal from "@/components/PricingModal";
import { getCurrentUser, UserProfile, getOnlineCount } from "@/lib/api";
import { getSocket } from "@/lib/socket";

export default function LandingPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isQuickStartOpen, setIsQuickStartOpen] = useState(false);
  const [quickStartMode, setQuickStartMode] = useState<"video" | "text">("video");
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [selectedProductHighlight, setSelectedProductHighlight] = useState<string | undefined>();
  const [onlineCount, setOnlineCount] = useState<number>(0);

  useEffect(() => {
    getCurrentUser().then((u) => setUser(u));

    getOnlineCount().then((count) => setOnlineCount(count));

    const socket = getSocket();
    const handleOnlineCount = (data: { count: number }) => {
      if (typeof data?.count === "number") {
        setOnlineCount(data.count);
      }
    };

    socket.on("online-count", handleOnlineCount);
    socket.emit("get-online-count");

    return () => {
      socket.off("online-count", handleOnlineCount);
    };
  }, []);

  const openQuick = (mode: "video" | "text") => {
    setQuickStartMode(mode);
    setIsQuickStartOpen(true);
  };

  const openPricingFor = (productType?: string) => {
    setSelectedProductHighlight(productType);
    setIsPricingOpen(true);
  };

  return (
    <div className="min-h-[100dvh] w-full bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Navigation */}
      <Navbar
        onOpenPricing={() => openPricingFor()}
        onOpenQuickStart={(mode) => openQuick(mode || "video")}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-6 pb-12 sm:pt-8 sm:pb-16 border-b border-slate-200 bg-white">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-blue-50/60 via-indigo-50/30 to-transparent pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Pill / Online Indicator */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mb-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold shadow-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span>
                {onlineCount === 0
                  ? "0 verified people online right now"
                  : `${onlineCount.toLocaleString()} verified ${onlineCount === 1 ? "person" : "people"} online right now`}
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
              <span>Strictly 18+ Adult Community</span>
            </div>
          </div>

          {/* Main Headline */}
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Instant Live Video & Text Discovery —{" "}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent">
                Zero Confusion
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto font-normal leading-relaxed">
              Connect with real people around the globe in seconds.{" "}
              <strong className="text-emerald-700 font-semibold">Random chats are 100% free</strong>. Pay only if you choose gender filters or extended dating discovery.
            </p>
          </div>

          {/* ZERO CONFUSION ACTION CARDS */}
          <div className="mt-6 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Card A: 100% FREE RANDOM (GREEN HIGHLIGHT) */}
            <div className="relative rounded-3xl p-5 sm:p-6 border-2 border-emerald-500/80 bg-gradient-to-b from-emerald-50/50 via-white to-white shadow-xl shadow-emerald-500/5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-extrabold uppercase tracking-wider shadow-sm">
                    🟢 100% Free Forever
                  </span>
                  <span className="text-xs font-bold text-emerald-700">₹0 / Standard</span>
                </div>

                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">Random Video & Text Chat</h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Connect immediately with random users. No credit card required.
                  </p>
                </div>

                <div className="space-y-2 border-t border-emerald-100 pt-3 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span><strong>15-minute introductory video trial</strong> included</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span><strong>15-minute introductory text trial</strong> included</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Unlimited free random interactions thereafter</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Skip to next user anytime with 1-click</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3.5 border-t border-emerald-100 space-y-2">
                <Link
                  href={user ? "/video" : "/auth?redirect=/video"}
                  className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow hover:shadow-md transition-all flex items-center justify-center gap-2 group"
                >
                  <Video className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span>Start Free Random Video</span>
                </Link>

                <Link
                  href={user ? "/text" : "/auth?redirect=/text"}
                  className="w-full py-2 px-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all flex items-center justify-center gap-2"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                  <span>Start Free Random Text</span>
                </Link>
              </div>
            </div>

            {/* Card B: PREFERRED GENDER & EXTENDED DATING (BLUE/GOLD HIGHLIGHT) */}
            <div className="relative rounded-3xl p-5 sm:p-6 border-2 border-blue-500/80 bg-gradient-to-b from-blue-50/40 via-white to-white shadow-xl shadow-blue-500/5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-extrabold uppercase tracking-wider shadow-sm flex items-center gap-1">
                    <Crown className="h-3.5 w-3.5 text-amber-300" /> ⭐ Paid Add-Ons
                  </span>
                  <span className="text-xs font-bold text-blue-700">Clear Upfront Prices</span>
                </div>

                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">Preferred Gender & Dating</h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Filter by gender or unlock unlimited dating discovery.
                  </p>
                </div>

                <div className="space-y-2 border-t border-blue-100 pt-3 text-xs text-slate-700">
                  <div className="p-2 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-xs">Preferred Gender Video</div>
                      <div className="text-[10px] text-slate-500">60 connected mins (Male/Female filter)</div>
                    </div>
                    <span className="font-extrabold text-blue-800 text-xs">₹599</span>
                  </div>

                  <div className="p-2 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-xs">Preferred Gender Text</div>
                      <div className="text-[10px] text-slate-500">180 connected mins (3 hours)</div>
                    </div>
                    <span className="font-extrabold text-blue-800 text-xs">₹299</span>
                  </div>

                  <div className="p-2 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-xs">Premium Dating Pass</div>
                      <div className="text-[10px] text-slate-500">7 days access after 15 free mutual matches</div>
                    </div>
                    <span className="font-extrabold text-blue-800 text-xs">₹499</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-5 pt-3.5 border-t border-blue-100">
                <button
                  onClick={() => openPricingFor()}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow hover:shadow-md transition-all flex items-center justify-center gap-2 group"
                >
                  <Crown className="h-4 w-4 text-amber-300 group-hover:rotate-12 transition-transform" />
                  <span>View Pricing & Recharge Wallet</span>
                </button>
                <div className="text-center text-[10px] text-slate-500 mt-1.5">
                  Deducted strictly for connected call time. Unused balance never expires.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE UI SPOTLIGHT (Faithfully showcasing user's reference image UI) */}
      <section className="py-14 bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" /> High-Definition Video Calling
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Designed for Smooth, Delightful Conversations
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Frosted glass controls, live audio waveform captions, picture-in-picture local preview, and integrated real-time chat.
            </p>
          </div>

          {/* Interactive Mockup Container matching user's reference screenshot */}
          <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-700/80 bg-white text-slate-900 max-w-5xl mx-auto flex flex-col md:flex-row">
            {/* Left: Video Area */}
            <div className="flex-1 relative bg-slate-950 flex flex-col" style={{ minHeight: "440px" }}>
              {/* Header Bar */}
              <div className="h-12 px-4 bg-white/95 backdrop-blur-md border-b border-slate-200 flex items-center justify-between z-20">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <span className="text-slate-400">‹</span>
                  <span>Call with &quot;Live Match Partner&quot;</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-800">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  <span>00:15:15</span>
                </div>
              </div>

              {/* Video Surface */}
              <div className="relative flex-1 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=1000&auto=format&fit=crop&q=80"
                  alt="Dr. Mark Wood"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 px-2.5 py-1 rounded-lg bg-black/40 backdrop-blur-md text-white text-xs font-semibold">
                  Dr. Mark Wood
                </div>

                {/* Picture-in-picture top-right tile */}
                <div className="absolute top-4 right-4 w-36 aspect-[4/3] rounded-xl overflow-hidden border-2 border-white/60 shadow-xl bg-slate-800">
                  <img
                    src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80"
                    alt="Oliver Smith"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-[9px] text-white font-semibold">
                    Oliver Smith
                  </div>
                </div>

                {/* Floating frosted glass controls at bottom */}
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 shadow-2xl">
                  <div className="p-2 rounded-full text-white hover:bg-white/20">
                    <Volume2 className="h-4 w-4" />
                  </div>
                  <div className="p-2 rounded-full text-white hover:bg-white/20">
                    <Mic className="h-4 w-4" />
                  </div>
                  <Link
                    href={user ? "/video" : "/auth?redirect=/video"}
                    className="p-3 rounded-full bg-red-600 text-white shadow hover:scale-105 transition-transform"
                    title="Start Live Call"
                  >
                    <PhoneOff className="h-4 w-4" />
                  </Link>
                  <div className="p-2 rounded-full text-white hover:bg-white/20">
                    <Video className="h-4 w-4" />
                  </div>
                  <div className="p-2 rounded-full text-white hover:bg-white/20">
                    <Maximize2 className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* Subtitle / wave bar */}
              <div className="h-11 px-4 bg-white border-t border-slate-200 flex items-center gap-2 text-xs text-slate-800 font-medium z-20">
                <div className="flex items-center gap-0.5 text-blue-600">
                  <span className="inline-block w-1 h-3 bg-blue-600 rounded-full animate-pulse" />
                  <span className="inline-block w-1 h-4 bg-blue-600 rounded-full animate-pulse delay-75" />
                  <span className="inline-block w-1 h-2 bg-blue-600 rounded-full animate-pulse delay-150" />
                </div>
                <span className="truncate text-slate-700 text-xs">
                  Hi, Oliver how&apos;s your health today? better than yesterday...
                </span>
              </div>
            </div>

            {/* Right: Integrated Chat Panel */}
            <div className="w-full md:w-80 bg-white border-l border-slate-200 flex flex-col justify-between">
              <div className="h-12 px-4 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Chat</span>
                <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                  Connected
                </span>
              </div>

              {/* Chat bubbles matching reference */}
              <div className="p-3 space-y-3 bg-slate-50/50 flex-1 overflow-y-auto text-xs">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="font-bold text-[11px] text-slate-800">Match Partner</span>
                    <span className="text-[10px] text-slate-400">09:45 AM</span>
                  </div>
                  <div className="bg-white border border-slate-200 p-2 rounded-xl text-slate-800 shadow-sm max-w-[90%]">
                    Hello! 👋
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <div className="text-[10px] text-slate-400 mb-1">09:45 AM</div>
                  <div className="bg-blue-600 text-white p-2 rounded-xl shadow-sm max-w-[90%]">
                    Hello! How can I help you?
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="font-bold text-[11px] text-slate-800">Match Partner</span>
                    <span className="text-[10px] text-slate-400">09:45 AM</span>
                  </div>
                  <div className="bg-white border border-slate-200 p-2 rounded-xl text-slate-800 shadow-sm max-w-[90%]">
                    I have a few questions about cardiology services. Could you help me with that?
                  </div>
                </div>
              </div>

              {/* Chat input */}
              <div className="p-2.5 border-t border-slate-100 flex items-center gap-1.5">
                <div className="flex-1 flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                  <Smile className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-slate-400">Type here...</span>
                </div>
                <div className="p-2 rounded-full bg-blue-600 text-white shadow">
                  <Send className="h-3 w-3" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link
              href={user ? "/video" : "/auth?redirect=/video"}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-lg hover:shadow-blue-500/25 transition-all"
            >
              <span>Try Live Experience Now</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS (3 Simple Steps) */}
      <section className="py-14 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Start Talking in 3 Easy Steps
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              No endless forms, questionnaires, or confusing paywalls.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 text-center space-y-2.5">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 font-bold text-base">
                1
              </div>
              <h3 className="text-sm font-bold text-slate-900">Choose Free or Filter</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Click <strong>Free Random</strong> for instant anonymous matchmaking, or choose <strong>Preferred Gender</strong> if you want specific gender filtering.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 text-center space-y-2.5">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 font-bold text-base">
                2
              </div>
              <h3 className="text-sm font-bold text-slate-900">Allow Camera & Mic</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Encrypted peer-to-peer WebRTC streaming. Your video and audio connect directly to your matched partner.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 text-center space-y-2.5">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 font-bold text-base">
                3
              </div>
              <h3 className="text-sm font-bold text-slate-900">Chat & Next</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Say hello, enjoy a spontaneous conversation, and hit <strong>Next</strong> whenever you want to meet someone new.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CORE PLATFORM FEATURES */}
      <section className="py-14 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              All In One Place
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              Explore 4 Discovery Channels
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Video */}
            <Link
              href={user ? "/video" : "/auth?redirect=/video"}
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 hover:shadow-lg transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Video className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Video Chat</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Face-to-face random WebRTC conversations with instant skip.
                </p>
              </div>
              <span className="mt-3 text-xs font-bold text-blue-600 flex items-center gap-1">
                Open Video <ArrowRight className="h-3 w-3" />
              </span>
            </Link>

            {/* Text */}
            <Link
              href={user ? "/text" : "/auth?redirect=/text"}
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-500 hover:shadow-lg transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="h-9 w-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Text Chat</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Anonymous, fast-paced text conversations with typing indicators.
                </p>
              </div>
              <span className="mt-3 text-xs font-bold text-indigo-600 flex items-center gap-1">
                Open Text <ArrowRight className="h-3 w-3" />
              </span>
            </Link>

            {/* Dating */}
            <Link
              href={user ? "/dating" : "/auth?redirect=/dating"}
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-rose-500 hover:shadow-lg transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="h-9 w-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Heart className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Dating Swipe</h3>
                <p className="text-xs text-slate-500 mt-1">
                  15 free mutual matches. Like or pass curated profile cards.
                </p>
              </div>
              <span className="mt-3 text-xs font-bold text-rose-600 flex items-center gap-1">
                Start Swiping <ArrowRight className="h-3 w-3" />
              </span>
            </Link>

            {/* Messages */}
            <Link
              href={user ? "/messages" : "/auth?redirect=/messages"}
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-lg transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Zap className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Message Requests</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Spam-free direct messaging. Chats open once requests are accepted.
                </p>
              </div>
              <span className="mt-3 text-xs font-bold text-emerald-600 flex items-center gap-1">
                View Inbox <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* SAFETY & 18+ NOTICE */}
      <section className="py-10 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-3">
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 text-blue-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Our Commitment to Safety</h2>
          <p className="text-xs text-slate-600 max-w-2xl mx-auto leading-relaxed">
            All users must be 18 years or older. We maintain zero tolerance for vulgarity, nudity in public lobbies, harassment, or underage presence. Every interaction features instant 1-click Report & Block controls.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 pt-1 text-xs font-semibold text-slate-500">
            <span>🛡️ 24/7 Moderation Review</span>
            <span>🔒 Peer-to-Peer Encryption</span>
            <span>🚫 Anti-Spam Protections</span>
            <span>⚖️ Grievance Redressal Mechanism</span>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-slate-400 py-10 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-sm mb-0.5">
              <Video className="h-4 w-4 text-blue-500" />
              <span>OmeglePlus</span>
            </div>
            <p className="text-slate-500 text-[11px]">
              The premium social discovery and live video chat platform. 18+ adults only.
            </p>
          </div>

          <div className="flex items-center gap-5 text-slate-300">
            <Link href="/pricing" className="hover:text-white transition-colors">
              Pricing Plans
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms & Safety
            </Link>
            <Link href="/admin" className="hover:text-white transition-colors">
              Admin Portal
            </Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">
              User Dashboard
            </Link>
          </div>

          <div className="text-[11px] text-slate-500">
            © 2026 OmeglePlus. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Modals */}
      <QuickStartModal
        isOpen={isQuickStartOpen}
        onClose={() => setIsQuickStartOpen(false)}
        defaultMode={quickStartMode}
        onSuccess={(u) => setUser(u)}
      />

      <PricingModal
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
        highlightProduct={selectedProductHighlight}
        onSuccess={() => getCurrentUser().then((u) => setUser(u))}
      />
    </div>
  );
}
