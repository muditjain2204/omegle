"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Check, Crown, Video, MessageSquare, Heart, Shield, Sparkles, Gift, Tag, Globe, CreditCard } from "lucide-react";
import confetti from "canvas-confetti";
import { createPaymentOrder, verifyPayment, redeemPromoCode, getCurrentUser, UserProfile } from "@/lib/api";
import { openRazorpayCheckout } from "@/lib/razorpay";

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  highlightProduct?: string;
}

export default function PricingModal({
  isOpen,
  onClose,
  onSuccess,
  highlightProduct,
}: PricingModalProps) {
  const [mounted, setMounted] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // VIP / Friend Promo Code states
  const [promoCode, setPromoCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    setMounted(true);
    getCurrentUser().then((u) => setCurrentUser(u)).catch(() => {});
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

  const handlePurchase = async (productType: string) => {
    setErrorMessage(null);
    setProcessingId(productType);

    try {
      // 1. Create order on backend (creates DB purchase + Razorpay order)
      const order = await createPaymentOrder(productType);

      // 2. Launch Razorpay Checkout Modal
      await openRazorpayCheckout({
        orderData: order,
        user: currentUser,
        onSuccess: (verifyRes) => {
          setSuccessMessage(verifyRes.message || "Payment successful! Your balance has been credited.");
          try {
            confetti({
              particleCount: 110,
              spread: 75,
              origin: { y: 0.6 },
            });
          } catch (e) {}
          if (onSuccess) onSuccess();

          setTimeout(() => {
            setSuccessMessage(null);
            onClose();
          }, 2000);
        },
        onError: (err: any) => {
          setErrorMessage(err.message || "Payment was cancelled or failed. Please try again.");
          setProcessingId(null);
        },
        onDismiss: () => {
          setProcessingId(null);
        },
      });
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to initialize payment gateway. Please try again.");
      setProcessingId(null);
    }
  };

  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim()) return;

    setIsRedeeming(true);
    setPromoError(null);
    setPromoSuccess(null);

    try {
      const res = await redeemPromoCode(promoCode.trim());
      setPromoSuccess(res.message);
      setPromoCode("");

      // Confetti celebratory burst
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch (e) {}

      if (onSuccess) onSuccess();
    } catch (err: any) {
      setPromoError(err.message || "Failed to redeem code. Please check and try again.");
    } finally {
      setIsRedeeming(false);
    }
  };

  const products = [
    {
      id: "FREE_RANDOM",
      title: "Random Video & Text",
      tier: "FREE",
      price: "₹0",
      duration: "Forever Free",
      description: "Chat with random users across the world without gender filtering.",
      features: [
        "15-minute introductory video trial",
        "15-minute introductory text trial",
        "Free unlimited fair-use matching thereafter",
        "P2P WebRTC video & microphone",
        "Instant Skip to next user",
      ],
      buttonText: "Current Plan",
      isFree: true,
      action: null,
    },
    {
      id: "VIDEO_PACK_60M",
      title: "Preferred Gender Video",
      tier: "PREMIUM",
      price: "₹599",
      duration: "60 Connected Minutes",
      description: "Match specifically with your preferred gender in live high-definition video.",
      features: [
        "60 minutes of real connected video time",
        "Female / Male gender filter option",
        "Deducted ONLY while connected (not waiting)",
        "Unused minutes never expire",
        "Priority queue matching",
      ],
      buttonText: "Purchase Video Pack (₹599)",
      isFree: false,
      productType: "VIDEO_PACK_60M",
      popular: true,
    },
    {
      id: "TEXT_PACK_180M",
      title: "Preferred Gender Text",
      tier: "PREMIUM",
      price: "₹299",
      duration: "180 Connected Minutes (3h)",
      description: "Filter live text conversations by your preferred gender.",
      features: [
        "180 connected conversation minutes",
        "Filter by Female or Male conversation partners",
        "Deducted strictly during live chat",
        "Remaining minutes saved to your balance",
        "Typing indicators & instant delivery",
      ],
      buttonText: "Purchase Text Pack (₹299)",
      isFree: false,
      productType: "TEXT_PACK_180M",
    },
    {
      id: "DATING_PASS_7D",
      title: "Premium Dating Pass",
      tier: "PREMIUM",
      price: "₹499",
      duration: "7 Days Full Access",
      description: "Continue discovering profiles after the free 15 mutual matches.",
      features: [
        "7 days of unlimited profile discovery",
        "Bypasses 15 mutual match ceiling",
        "Advanced interest & location filters",
        "See mutual likes instantly",
        "Existing matches always stay free",
      ],
      buttonText: "Unlock Dating Pass (₹499)",
      isFree: false,
      productType: "DATING_PASS_7D",
    },
  ];

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 md:p-8 flex items-start justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Floating viewport-pinned close button (always visible regardless of scroll) */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close pricing window"
        title="Close window (Esc)"
        className="fixed top-3 right-3 sm:top-5 sm:right-5 z-[110] flex items-center justify-center h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-slate-900/95 text-white hover:bg-slate-800 hover:text-amber-300 border border-slate-700/80 shadow-2xl backdrop-blur-md transition-all hover:scale-110 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400"
      >
        <X className="h-5 w-5 stroke-[2.5]" />
      </button>

      <div className="relative w-full max-w-5xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-4 sm:my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 px-6 sm:px-8 py-7 sm:py-8 text-white text-center">
          {/* Prominent Cross Button on the Top Bar */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close pricing window"
            title="Close window"
            className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-md border border-white/30 shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <X className="h-4 w-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Close</span>
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold mb-3">
            <Crown className="h-4 w-4" /> 100% Transparent Freemium Model
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Clear Pricing. Zero Hidden Fees.
          </h2>
          <p className="text-slate-300 text-sm max-w-xl mx-auto mt-2">
            Random video and text chats are <strong className="text-emerald-400">always free</strong>. Pay only when you choose specific gender preferences or extended dating access.
          </p>
        </div>

        {/* Alerts */}
        {successMessage && (
          <div className="mx-6 mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-2">
            <Check className="h-5 w-5 text-emerald-600" />
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="mx-6 mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
            {errorMessage}
          </div>
        )}

        {/* Pricing Cards Grid */}
        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((p) => {
            const isHighlighted = highlightProduct === p.productType || p.popular;
            return (
              <div
                key={p.id}
                className={`relative flex flex-col justify-between rounded-2xl p-6 border transition-all ${
                  isHighlighted
                    ? "border-amber-400 bg-amber-50/20 shadow-lg ring-2 ring-amber-400/40"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
                }`}
              >
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-bold uppercase tracking-wider shadow">
                    Most Popular
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                        p.isFree
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {p.tier}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">{p.duration}</span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 leading-snug">{p.title}</h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-slate-950">{p.price}</span>
                    <span className="text-xs text-slate-500">
                      {p.isFree ? "/ standard" : "/ one-time pack"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">{p.description}</p>

                  <div className="mt-5 space-y-2.5 border-t border-slate-100 pt-4">
                    {p.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                        <Check className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  {p.isFree ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 text-xs font-semibold cursor-default"
                    >
                      Active Free Service
                    </button>
                  ) : (
                    <button
                      onClick={() => p.productType && handlePurchase(p.productType)}
                      disabled={processingId !== null}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-bold shadow hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                    >
                      {processingId === p.productType ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <>
                          <Crown className="h-3.5 w-3.5 text-amber-200" />
                          <span>{p.buttonText}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* VIP Friend Pass / Promo Code Section */}
        <div className="mx-6 sm:mx-8 mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-blue-500/10 border border-amber-300/40 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-left w-full md:w-auto">
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 text-white flex items-center justify-center shrink-0 shadow-md">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Friend Pass & VIP Promo Code</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">100% Free</span>
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Have a code from an admin or friend? Redeem below to unlock full VIP privileges instantly.
              </p>
            </div>
          </div>

          <form onSubmit={handleRedeemCode} className="w-full md:w-auto flex items-center gap-2">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="e.g. FRIENDS_VIP"
              className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase tracking-wider w-full md:w-52"
            />
            <button
              type="submit"
              disabled={isRedeeming || !promoCode.trim()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold shadow-md disabled:opacity-50 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              {isRedeeming ? "Redeeming..." : "Redeem Pass"}
            </button>
          </form>
        </div>

        {/* Promo code feedback banners */}
        {promoSuccess && (
          <div className="mx-6 sm:mx-8 mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{promoSuccess}</span>
          </div>
        )}
        {promoError && (
          <div className="mx-6 sm:mx-8 mb-6 p-4 rounded-xl bg-red-50 border border-red-300 text-red-700 text-xs font-semibold">
            {promoError}
          </div>
        )}

        {/* Razorpay Gateway & International Support Badge */}
        <div className="mx-6 sm:mx-8 mb-4 px-4 py-2.5 rounded-xl bg-blue-50/70 border border-blue-200/80 flex flex-wrap items-center justify-between gap-2 text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-600 shrink-0" />
            <span className="font-semibold">Razorpay Secure Checkout:</span>
            <span className="text-slate-600">Supports UPI, NetBanking, and International Cards (USD, EUR, GBP, AUD & 100+ Currencies)</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-200">
            <CreditCard className="h-3 w-3" />
            <span>Overseas Payments Accepted</span>
          </div>
        </div>

        {/* Footer Guarantee */}
        <div className="bg-slate-50 border-t border-slate-200 px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-600" />
            <span>
              Secure server ledger deduction. Paid minutes are only deducted for active connected call time.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-400 hidden sm:inline">No recurring auto-debit on packs.</span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer shadow-sm"
            >
              Close Window
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

