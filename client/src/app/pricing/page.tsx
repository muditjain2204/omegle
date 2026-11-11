"use client";

import React, { useState, useEffect } from "react";
import {
  Crown,
  Check,
  Shield,
  Video,
  MessageSquare,
  Heart,
  Clock,
  Zap,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import {
  createPaymentOrder,
  verifyPayment,
  getPaymentHistory,
  getCurrentUser,
  UserProfile,
} from "@/lib/api";

export default function PricingPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const u = await getCurrentUser();
      setUser(u);
      const h = await getPaymentHistory();
      setHistory(h.purchases || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePurchase = async (productType: string) => {
    setErrorMessage(null);
    setProcessingId(productType);

    try {
      const order = await createPaymentOrder(productType);
      const verifyRes = await verifyPayment(order.purchaseId);
      setSuccessMessage(verifyRes.message || "Purchase completed! Your balance is updated.");
      loadData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "Payment failed. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  const products = [
    {
      id: "PRODUCT_1_FREE",
      title: "Random Video Chat",
      tier: "FREE",
      price: "₹0",
      duration: "Standard Access",
      badge: "Free Forever",
      description: "Chat with random users worldwide without gender filtering.",
      features: [
        "15-minute introductory video trial",
        "Free unlimited fair-use video calls thereafter",
        "Random matchmaking without gender preference",
        "P2P WebRTC video & microphone",
        "Instant Skip to next user",
      ],
      buttonText: "Active Free Standard",
      isFree: true,
      action: null,
    },
    {
      id: "VIDEO_PACK_60M",
      title: "Preferred Gender Video",
      tier: "PREMIUM",
      price: "₹599",
      duration: "60 Connected Minutes",
      badge: "One-Time Pack",
      description: "Filter video connections by your preferred gender.",
      features: [
        "60 connected minutes included (3,600s)",
        "Select Male or Female conversation partner",
        "Deducted ONLY while connected in a call",
        "Unused minutes never expire",
        "Priority matchmaking queue",
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
      badge: "One-Time Pack",
      description: "Filter live text conversations by your preferred gender.",
      features: [
        "180 connected conversation minutes",
        "Select preferred gender for text chat",
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
      badge: "7-Day Subscription",
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

  return (
    <div className="min-h-[100dvh] w-full bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
            <Crown className="h-4 w-4 text-amber-600" />
            <span>Freemium & Transparent Pricing</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Clear Products. Zero Deception.
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Random matching is <strong>free forever</strong>. One-time packs for gender filtering never expire and are deducted only when connected.
          </p>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="max-w-xl mx-auto p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-2">
            <Check className="h-5 w-5 text-emerald-600" />
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="max-w-xl mx-auto p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm font-semibold">
            {errorMessage}
          </div>
        )}

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((p) => {
            return (
              <div
                key={p.id}
                className={`relative flex flex-col justify-between rounded-3xl p-6 border transition-all ${
                  p.popular
                    ? "border-amber-400 bg-white shadow-xl ring-2 ring-amber-400/40"
                    : "border-slate-200 bg-white hover:border-slate-300 shadow-md"
                }`}
              >
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-bold uppercase tracking-wider shadow">
                    Best Value
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
                      className="w-full py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 text-xs font-semibold cursor-default"
                    >
                      Active Free Standard
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

        {/* Purchase History Ledger */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Your Transaction & Usage Ledger</h2>
            <div className="text-xs text-slate-500">Auditable Server History</div>
          </div>

          {history.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 italic">No previous purchases on this account.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Product</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((h) => (
                    <tr key={h.id}>
                      <td className="p-3 text-slate-500">
                        {new Date(h.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3 font-bold text-slate-800">{h.productType}</td>
                      <td className="p-3 font-semibold text-slate-900">₹{h.amountPaise / 100}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {h.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500">
                        {h.transactions?.[0]?.remarks || "Payment completed"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

