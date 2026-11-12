"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Send,
  Smile,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Crown,
  ChevronLeft,
  RotateCcw,
  User,
  Users,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import PricingModal from "@/components/PricingModal";
import ReportModal from "@/components/ReportModal";
import { getSocket } from "@/lib/socket";
import { getCurrentUser, UserProfile } from "@/lib/api";

interface TextMessage {
  id: string;
  senderName: string;
  text: string;
  timestamp: string;
  isMe: boolean;
}

export default function TextChatPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [matchStatus, setMatchStatus] = useState<"IDLE" | "SEARCHING" | "CONNECTED">("IDLE");
  const [currentMode, setCurrentMode] = useState<"random" | "preferred_gender">("random");
  const [targetGender, setTargetGender] = useState<"ANY" | "FEMALE" | "MALE">("ANY");

  const [peerInfo, setPeerInfo] = useState<{
    id: string;
    displayName: string;
    avatarUrl?: string;
    gender?: string;
  } | null>(null);

  const [callDuration, setCallDuration] = useState(0);
  const [messages, setMessages] = useState<TextMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [partnerIsTyping, setPartnerIsTyping] = useState(false);

  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const partnerTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const lastTypingSentRef = useRef<number>(0);

  const userRef = useRef<UserProfile | null>(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (!u) {
        window.location.href = "/auth?redirect=/text";
        return;
      }
      setUser(u);
      setAuthChecking(false);
    });
  }, []);

  useEffect(() => {
    const socket = getSocket();

    socket.on("match-found", (data) => {
      setMatchStatus("CONNECTED");
      setPeerInfo(data.peer);
      setCallDuration(0);
      setMessages([
        {
          id: `sys_${Date.now()}`,
          senderName: "System",
          text: `You are now chatting with a stranger. Say hi! Remember to keep conversations respectful.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isMe: false,
        },
      ]);
    });

    socket.on("queue-status", (data: { status: string; message?: string }) => {
      if (data.status === "SEARCHING") {
        setMatchStatus("SEARCHING");
      }
    });

    socket.on("session-tick", (data) => {
      setCallDuration(data.durationSeconds);
    });

    socket.on("session-message", (msg) => {
      const isMine = msg.senderSocketId === socket.id;
      setMessages((prev) => [
        ...prev,
        {
          id: msg.id,
          senderName: msg.senderName,
          text: msg.text,
          timestamp: msg.timestamp,
          isMe: isMine,
        },
      ]);
      setPartnerIsTyping(false);
      if (partnerTypingTimeoutRef.current) {
        clearTimeout(partnerTypingTimeoutRef.current);
      }
    });

    socket.on("session-typing", (data) => {
      if (data.senderSocketId !== socket.id) {
        if (data.isTyping) {
          setPartnerIsTyping(true);
          if (partnerTypingTimeoutRef.current) {
            clearTimeout(partnerTypingTimeoutRef.current);
          }
          // Extends notification as long as continuous typing heartbeats arrive
          partnerTypingTimeoutRef.current = setTimeout(() => {
            setPartnerIsTyping(false);
          }, 4500);
        } else {
          setPartnerIsTyping(false);
          if (partnerTypingTimeoutRef.current) {
            clearTimeout(partnerTypingTimeoutRef.current);
          }
        }
      }
    });

    socket.on("peer-disconnected", () => {
      setMatchStatus("SEARCHING");
      setPeerInfo(null);
      setPartnerIsTyping(false);
      if (partnerTypingTimeoutRef.current) {
        clearTimeout(partnerTypingTimeoutRef.current);
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `dis_${Date.now()}`,
          senderName: "System",
          text: "Partner disconnected. Searching for next match...",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isMe: false,
        },
      ]);
      handleNextMatch();
    });

    socket.on("insufficient_balance", () => {
      setMatchStatus("IDLE");
      setIsPricingOpen(true);
    });

    socket.on("out_of_time", () => {
      setMatchStatus("IDLE");
      setPeerInfo(null);
      setIsPricingOpen(true);
    });

    socket.on("balance-update", (data: { paidTextSecondsAvailable?: number }) => {
      setUser((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          usageBalance: {
            ...prev.usageBalance,
            paidVideoSecondsAvailable: prev.usageBalance?.paidVideoSecondsAvailable ?? 0,
            paidTextSecondsAvailable: data.paidTextSecondsAvailable ?? prev.usageBalance?.paidTextSecondsAvailable ?? 0,
          },
        };
      });
    });

    return () => {
      socket.off("match-found");
      socket.off("session-tick");
      socket.off("session-message");
      socket.off("session-typing");
      socket.off("peer-disconnected");
      socket.off("insufficient_balance");
      socket.off("out_of_time");
      socket.off("balance-update");
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partnerIsTyping]);

  const handleStartMatch = (mode: "random" | "preferred_gender") => {
    const socket = getSocket();
    const currentUser = userRef.current || user;

    if (mode === "preferred_gender") {
      const available = currentUser?.usageBalance?.paidTextSecondsAvailable || 0;
      if (available <= 0) {
        setIsPricingOpen(true);
        return;
      }
    }

    setCurrentMode(mode);
    setMatchStatus("SEARCHING");
    setPeerInfo(null);

    socket.emit("join-queue", {
      userId: currentUser?.id || `guest_${Date.now()}`,
      displayName: currentUser?.profile?.displayName || "Guest User",
      avatarUrl: currentUser?.profile?.avatarUrl,
      gender: currentUser?.profile?.gender || "OTHER",
      targetGender: mode === "preferred_gender" ? targetGender : "ANY",
      type: "text",
      mode,
    });
  };

  const handleNextMatch = () => {
    const socket = getSocket();
    socket.emit("next-match");
    handleStartMatch(currentMode);
  };

  const handleEndChat = () => {
    const socket = getSocket();
    socket.emit("leave-session");
    setMatchStatus("IDLE");
    setPeerInfo(null);
    setCallDuration(0);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || matchStatus !== "CONNECTED") return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    isTypingRef.current = false;

    const socket = getSocket();
    socket.emit("session-typing", { isTyping: false });

    socket.emit("send-session-message", {
      text: chatInput.trim(),
      senderName: user?.profile?.displayName || "You",
    });

    setChatInput("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setChatInput(val);
    const socket = getSocket();

    if (matchStatus !== "CONNECTED") return;

    if (val.trim().length > 0) {
      const now = Date.now();
      // Send typing pulse immediately if not already typing, or every 1.5s as long as user keeps typing
      if (!isTypingRef.current || now - lastTypingSentRef.current > 1500) {
        isTypingRef.current = true;
        lastTypingSentRef.current = now;
        socket.emit("session-typing", { isTyping: true });
      }

      // Reset the idle stop-typing timer
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Only stop typing when user stops writing for 2.5 seconds
      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false;
        socket.emit("session-typing", { isTyping: false });
      }, 2500);
    } else {
      // Input was cleared completely
      if (isTypingRef.current) {
        isTypingRef.current = false;
        socket.emit("session-typing", { isTyping: false });
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-[100dvh] w-full bg-slate-50 flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center text-slate-900 gap-3 p-6 text-center">
          <span className="h-8 w-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Authenticating & initializing text chat session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] min-h-[100dvh] overflow-hidden flex flex-col bg-slate-50 font-sans">
      <div className="shrink-0">
        <Navbar onOpenPricing={() => setIsPricingOpen(true)} />
      </div>

      <main className="flex-1 min-h-0 max-w-6xl w-full mx-auto p-2 sm:p-3 md:p-4 mb-11 sm:mb-12 lg:mb-0 flex flex-col md:flex-row gap-2.5 sm:gap-3 md:gap-4 overflow-hidden">
        {/* Left Column: Match Controls & Mode Selector */}
        <div className="w-full md:w-80 md:h-full bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-md p-3 sm:p-4 md:p-5 flex flex-col justify-between shrink-0 overflow-y-auto overscroll-contain">
          <div className="space-y-2.5 sm:space-y-4 md:space-y-6">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 md:h-8 md:w-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">
                  <MessageSquare className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </div>
                <div>
                  <h1 className="text-sm md:text-lg font-bold text-slate-900 leading-tight">Text Chat</h1>
                  <p className="hidden md:block text-xs text-slate-500">
                    Spontaneous live text chats with instant matchmaking.
                  </p>
                </div>
              </div>

              {/* Compact trial balance for half/small screen */}
              <div className="flex md:hidden items-center gap-1.5 text-[10px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl">
                <span>Free: <strong className="text-slate-900">{Math.max(0, 15 - Math.floor((user?.trialEntitlement?.textTrialUsedSeconds || 0) / 60))}/15m</strong></span>
                {Math.floor((user?.usageBalance?.paidTextSecondsAvailable || 0) / 60) > 0 && (
                  <span className="text-amber-700 font-bold">• Paid: {Math.floor((user?.usageBalance?.paidTextSecondsAvailable || 0) / 60)}m</span>
                )}
              </div>
            </div>

            {/* Mode Selector (2-column on mobile/half screen, stacked on desktop) */}
            <div className="space-y-1.5 md:space-y-2">
              <label className="text-[10px] md:text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Conversation Mode
              </label>

              <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
                <button
                  onClick={() => setCurrentMode("random")}
                  className={`p-2 sm:p-2.5 md:p-3 rounded-xl sm:rounded-2xl border text-left transition-all cursor-pointer ${
                    currentMode === "random"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-500 shadow-sm"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      Random Text
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-900">
                      Free
                    </span>
                  </div>
                  <div className="hidden md:block text-[11px] text-slate-500 mt-1">
                    Connect with any random available user.
                  </div>
                </button>

                <button
                  onClick={() => setCurrentMode("preferred_gender")}
                  className={`p-2 sm:p-2.5 md:p-3 rounded-xl sm:rounded-2xl border text-left transition-all cursor-pointer ${
                    currentMode === "preferred_gender"
                      ? "border-amber-500 bg-amber-50 text-amber-950 ring-1 ring-amber-500 shadow-sm"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs flex items-center gap-1">
                      <Crown className="h-3 w-3 text-amber-600 shrink-0" />
                      <span className="truncate">Gender Filter</span>
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 shrink-0">
                      ₹299 Pack
                    </span>
                  </div>
                  <div className="hidden md:block text-[11px] text-slate-500 mt-1">
                    180 connected minutes (3 hours).
                  </div>
                </button>
              </div>
            </div>

            {currentMode === "preferred_gender" && (
              <div className="space-y-1.5 pt-1 border-t border-slate-100">
                <label className="text-[10px] md:text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Select Target Gender
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setTargetGender("FEMALE")}
                    className={`py-1.5 md:py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      targetGender === "FEMALE"
                        ? "bg-amber-500 text-white border-amber-600 shadow"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Female
                  </button>
                  <button
                    onClick={() => setTargetGender("MALE")}
                    className={`py-1.5 md:py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      targetGender === "MALE"
                        ? "bg-amber-500 text-white border-amber-600 shadow"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Male
                  </button>
                </div>
              </div>
            )}

            {/* Trial / Paid balance display (Desktop full card) */}
            <div className="hidden md:block p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-600">
                <span>Free Text Trial:</span>
                <span className="font-bold text-slate-900">
                  {Math.max(0, 15 - Math.floor((user?.trialEntitlement?.textTrialUsedSeconds || 0) / 60))}/15 mins
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Paid Gender Minutes:</span>
                <span className="font-bold text-amber-700">
                  {Math.floor((user?.usageBalance?.paidTextSecondsAvailable || 0) / 60)} mins
                </span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="mt-2 sm:mt-3 md:mt-6 md:pt-4 md:border-t md:border-slate-100">
            {matchStatus === "CONNECTED" ? (
              <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
                <button
                  onClick={handleNextMatch}
                  className="w-full py-2 sm:py-2.5 md:py-3 rounded-xl sm:rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  <span>Next Stranger</span>
                </button>
                <button
                  onClick={handleEndChat}
                  className="w-full py-2 sm:py-2.5 md:py-2.5 rounded-xl sm:rounded-2xl border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center"
                >
                  End Chat
                </button>
              </div>
            ) : matchStatus === "SEARCHING" ? (
              <button
                onClick={handleEndChat}
                className="w-full py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-slate-800 text-white font-bold text-xs shadow flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Searching (Cancel)</span>
              </button>
            ) : (
              <button
                onClick={() => handleStartMatch(currentMode)}
                className="w-full py-2.5 sm:py-3 md:py-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Start Text Chat</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Chat Panel */}
        <div className="flex-1 min-h-0 h-full bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="h-12 sm:h-14 md:h-16 px-4 md:px-6 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                {peerInfo?.avatarUrl ? (
                  <img src={peerInfo.avatarUrl} alt="Peer" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-5 w-5 text-slate-400" />
                )}
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {matchStatus === "CONNECTED"
                    ? peerInfo?.displayName || "Stranger"
                    : matchStatus === "SEARCHING"
                    ? "Searching..."
                    : "Not Connected"}
                </h2>
                <div className="text-[11px] text-slate-500">
                  {matchStatus === "CONNECTED"
                    ? `Connected • ${Math.floor(callDuration / 60)}m ${callDuration % 60}s`
                    : "Click 'Start Text Chat' to begin"}
                </div>
              </div>
            </div>

            {matchStatus === "CONNECTED" && (
              <button
                onClick={() => setIsReportOpen(true)}
                className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Report user"
              >
                <ShieldAlert className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Messages List */}
          <div className="flex-1 min-h-0 p-3 sm:p-4 md:p-6 overflow-y-auto overscroll-contain space-y-3 md:space-y-4 bg-slate-50/40">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 text-slate-400">
                <MessageSquare className="h-10 w-10 text-slate-300" />
                <p className="text-xs max-w-xs">
                  Your conversation will appear here once connected. Click Start to match with someone friendly!
                </p>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${
                    m.senderName === "System"
                      ? "items-center"
                      : m.isMe
                      ? "items-end"
                      : "items-start"
                  }`}
                >
                  {m.senderName === "System" ? (
                    <div className="px-3 py-1 rounded-full bg-slate-200/80 text-[11px] text-slate-600 font-medium my-2">
                      {m.text}
                    </div>
                  ) : (
                    <>
                      <div className="text-[10px] text-slate-400 mb-1 px-1">
                        {m.isMe ? "You" : m.senderName} • {m.timestamp}
                      </div>
                      <div
                        className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                          m.isMe
                            ? "bg-blue-600 text-white rounded-br-sm"
                            : "bg-white text-slate-800 border border-slate-200 rounded-bl-sm"
                        }`}
                      >
                        {m.text}
                      </div>
                    </>
                  )}
                </div>
              ))
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Typing Notification Banner (Pinned at the end of the message box, immediately above typing input bar) */}
          {partnerIsTyping && (
            <div className="shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-50/90 via-slate-50 to-blue-50/90 border-t border-blue-100 flex items-center justify-between animate-in fade-in slide-in-from-bottom-1 duration-150">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                  {peerInfo?.displayName?.charAt(0) || "S"}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-blue-900 font-medium">
                  <span className="font-bold text-slate-800">{peerInfo?.displayName || "Stranger"}</span>
                  <span className="text-slate-500">is typing</span>
                  <span className="inline-flex items-center gap-0.5 ml-1">
                    <span className="h-1.5 w-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-blue-500 font-semibold uppercase tracking-wider">typing...</span>
            </div>
          )}

          {/* Input Box */}
          <form
            onSubmit={handleSendMessage}
            className="p-2 sm:p-2.5 md:p-3 border-t border-slate-100 bg-white flex items-center gap-2 sm:gap-3 shrink-0"
          >
            <div className="flex-1 flex items-center gap-2 bg-slate-100 rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-200/80 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
              <Smile className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                type="text"
                disabled={matchStatus !== "CONNECTED"}
                placeholder={
                  matchStatus === "CONNECTED"
                    ? "Type your message..."
                    : "Connect to start chatting..."
                }
                value={chatInput}
                onChange={handleInputChange}
                className="flex-1 bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none disabled:cursor-not-allowed"
              />
            </div>
            <button
              type="submit"
              disabled={!chatInput.trim() || matchStatus !== "CONNECTED"}
              className="p-2.5 sm:p-3 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white shadow transition-all shrink-0 cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </main>

      <PricingModal
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
        highlightProduct="TEXT_PACK_180M"
        onSuccess={() => getCurrentUser().then((u) => setUser(u))}
      />

      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        targetUserId={peerInfo?.id || "unknown_peer"}
        targetUserName={peerInfo?.displayName || "Current Partner"}
        onReportSuccess={handleNextMatch}
      />
    </div>
  );
}

