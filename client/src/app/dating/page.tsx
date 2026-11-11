"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Heart,
  X,
  Sparkles,
  MapPin,
  CheckCircle,
  Crown,
  MessageCircle,
  ArrowRight,
  ShieldCheck,
  Zap,
  Mail,
} from "lucide-react";
import confetti from "canvas-confetti";
import Navbar from "@/components/Navbar";
import PricingModal from "@/components/PricingModal";
import SendMessageRequestModal from "@/components/SendMessageRequestModal";
import { getDatingProfiles, likeProfile, passProfile, getMatches, getCurrentUser, UserProfile } from "@/lib/api";

interface DatingCard {
  userId: string;
  displayName: string;
  age: number;
  gender: string;
  avatarUrl?: string;
  location: string;
  headline?: string;
  bio?: string;
  photos: string[];
  interests: string[];
  verifiedBadge?: boolean;
}

export default function DatingPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [profiles, setProfiles] = useState<DatingCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mutualMatchesCount, setMutualMatchesCount] = useState(0);
  const [isDatingPremium, setIsDatingPremium] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Mutual Match Celebration Modal
  const [matchedPartner, setMatchedPartner] = useState<DatingCard | null>(null);

  // Pricing Modal
  const [isPricingOpen, setIsPricingOpen] = useState(false);

  // Message Request Modal
  const [requestTarget, setRequestTarget] = useState<DatingCard | null>(null);

  useEffect(() => {
    loadDatingData();
  }, []);

  const loadDatingData = async () => {
    setIsLoading(true);
    try {
      const u = await getCurrentUser();
      if (!u) {
        window.location.href = "/auth?redirect=/dating";
        return;
      }
      setUser(u);

      const res = await getDatingProfiles();
      setProfiles(res.profiles || []);
      setMutualMatchesCount(res.mutualMatchesCount || 0);
      setIsDatingPremium(Boolean(res.isDatingPremium));
      if (res.mutualMatchesCount >= 15 && !res.isDatingPremium) {
        setLimitReached(true);
      }
    } catch (err: any) {
      if (err.message && err.message.includes("limit reached")) {
        setLimitReached(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async (isSuperLike = false) => {
    if (currentIndex >= profiles.length) return;
    const currentProfile = profiles[currentIndex];

    try {
      const res = await likeProfile(currentProfile.userId, isSuperLike);

      if (res.limitReached) {
        setLimitReached(true);
        setIsPricingOpen(true);
        return;
      }

      if (res.mutualMatch) {
        setMatchedPartner(currentProfile);
        setMutualMatchesCount(res.mutualMatchesCount || mutualMatchesCount + 1);

        // Fire celebration confetti!
        try {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch (e) {}
      }

      setCurrentIndex((prev) => prev + 1);
    } catch (err: any) {
      if (err.message && err.message.includes("limit")) {
        setLimitReached(true);
        setIsPricingOpen(true);
      }
    }
  };

  const handlePass = async () => {
    if (currentIndex >= profiles.length) return;
    const currentProfile = profiles[currentIndex];
    try {
      await passProfile(currentProfile.userId);
    } catch (e) {}
    setCurrentIndex((prev) => prev + 1);
  };

  const currentCard = profiles[currentIndex];

  return (
    <div className="min-h-[100dvh] w-full bg-slate-50 flex flex-col font-sans">
      <Navbar onOpenPricing={() => setIsPricingOpen(true)} />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 pb-20 lg:pb-6 flex flex-col items-center">
        {/* Top Status & 15-Match Counter Bar */}
        <div className="w-full max-w-md bg-white rounded-2xl p-4 mb-6 shadow-sm border border-slate-200/80 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span>Free Matches Used:</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                mutualMatchesCount >= 15 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-800"
              }`}>
                {mutualMatchesCount}/15
              </span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {isDatingPremium ? "⭐ Unlimited Discovery Active" : "15 mutual matches are 100% free"}
            </div>
          </div>

          <Link
            href="/messages"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            <MessageCircle className="h-4 w-4 text-blue-600" />
            <span>My Matches</span>
          </Link>
        </div>

        {/* Free limit reached banner */}
        {limitReached && !isDatingPremium && (
          <div className="w-full max-w-md mb-6 p-5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg space-y-2 text-center animate-in fade-in">
            <Crown className="h-6 w-6 mx-auto text-amber-200" />
            <h3 className="text-base font-extrabold">You reached your 15 Free Mutual Matches!</h3>
            <p className="text-xs text-amber-100 leading-relaxed">
              To discover more profiles and continue swiping, upgrade to <strong>Dating Premium</strong> for just ₹499 for 7 days. Your existing matches remain free to chat with forever!
            </p>
            <button
              onClick={() => setIsPricingOpen(true)}
              className="mt-2 px-5 py-2.5 rounded-xl bg-white text-amber-800 font-bold text-xs shadow hover:bg-amber-50 transition-colors"
            >
              Unlock 7-Day Dating Pass (₹499)
            </button>
          </div>
        )}

        {/* Swipe Card Stack */}
        {isLoading ? (
          <div className="w-full max-w-md h-[540px] rounded-3xl bg-white border border-slate-200 shadow-xl flex flex-col items-center justify-center p-8 space-y-4">
            <div className="h-10 w-10 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin" />
            <p className="text-xs font-semibold text-slate-500">Finding curated discovery profiles...</p>
          </div>
        ) : currentCard && (!limitReached || isDatingPremium) ? (
          <div className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-2xl transition-all">
            {/* Main Photo */}
            <div className="relative h-[380px] w-full bg-slate-900 overflow-hidden">
              <img
                src={currentCard.photos[0] || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80"}
                alt={currentCard.displayName}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {/* Verified Badge */}
              {currentCard.verifiedBadge && (
                <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-blue-500/80 backdrop-blur-md text-white text-[11px] font-bold flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>18+ Verified</span>
                </div>
              )}

              {/* Identity on photo */}
              <div className="absolute bottom-4 left-5 right-5 text-white">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-2xl font-extrabold tracking-tight">{currentCard.displayName}</h2>
                  <span className="text-xl font-light text-slate-300">{currentCard.age}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-300 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 text-rose-400" />
                  <span>{currentCard.location || "Nearby"}</span>
                </div>
              </div>
            </div>

            {/* Profile Bio & Interests */}
            <div className="p-5 space-y-4">
              {currentCard.headline && (
                <div className="text-xs font-semibold text-slate-800 italic">
                  &quot;{currentCard.headline}&quot;
                </div>
              )}

              <p className="text-xs text-slate-600 leading-relaxed">
                {currentCard.bio}
              </p>

              {/* Interests Tags */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {currentCard.interests.map((interest, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold"
                  >
                    {interest}
                  </span>
                ))}
              </div>

              {/* Swipe Action Buttons */}
              <div className="pt-3 flex items-center justify-center gap-6 border-t border-slate-100">
                <button
                  onClick={handlePass}
                  className="p-4 rounded-full border-2 border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                  title="Pass"
                >
                  <X className="h-7 w-7" />
                </button>

                <button
                  onClick={() => handleLike(true)}
                  className="p-3.5 rounded-full border-2 border-amber-300 text-amber-500 hover:bg-amber-50 transition-all shadow-sm active:scale-95"
                  title="Super Like"
                >
                  <Zap className="h-6 w-6" />
                </button>

                <button
                  onClick={() => setRequestTarget(currentCard)}
                  className="p-3.5 rounded-full border-2 border-blue-200 text-blue-500 hover:bg-blue-50 transition-all shadow-sm active:scale-95"
                  title="Send Direct Note"
                >
                  <Mail className="h-6 w-6" />
                </button>

                <button
                  onClick={() => handleLike(false)}
                  className="p-4 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg hover:from-rose-600 hover:to-pink-600 transition-all active:scale-95"
                  title="Like"
                >
                  <Heart className="h-7 w-7 fill-white" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-4 shadow-lg">
            <div className="h-16 w-16 mx-auto rounded-full bg-rose-50 text-rose-500 flex items-center justify-center">
              <Heart className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">You&apos;re All Caught Up!</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              You have reviewed all available discovery profiles in your area. Check back shortly as new members join!
            </p>
            <div className="pt-2">
              <Link
                href="/messages"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow hover:bg-blue-700 transition-colors"
              >
                <span>View Conversations & Matches</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* MUTUAL MATCH CELEBRATION MODAL */}
      {matchedPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl border border-slate-200 space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <Heart className="h-8 w-8 fill-rose-600 animate-bounce" />
            </div>

            <h2 className="text-2xl font-black text-slate-900">It&apos;s a Mutual Match! 🎉</h2>
            <p className="text-xs text-slate-600">
              You and <strong>{matchedPartner.displayName}</strong> both liked each other! An accepted conversation has been opened.
            </p>

            <div className="flex items-center justify-center gap-4 py-2">
              <img
                src={user?.profile?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"}
                alt="You"
                className="h-16 w-16 rounded-full border-2 border-rose-500 object-cover shadow"
              />
              <Heart className="h-6 w-6 text-rose-500 fill-rose-500" />
              <img
                src={matchedPartner.photos[0] || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100"}
                alt={matchedPartner.displayName}
                className="h-16 w-16 rounded-full border-2 border-rose-500 object-cover shadow"
              />
            </div>

            <div className="space-y-2 pt-2">
              <Link
                href="/messages"
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-xs shadow hover:from-rose-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Send Direct Message</span>
              </Link>
              <button
                onClick={() => setMatchedPartner(null)}
                className="w-full py-2.5 rounded-2xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Keep Swiping
              </button>
            </div>
          </div>
        </div>
      )}

      <PricingModal
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
        highlightProduct="DATING_PASS_7D"
        onSuccess={loadDatingData}
      />

      {requestTarget && (
        <SendMessageRequestModal
          isOpen={Boolean(requestTarget)}
          onClose={() => setRequestTarget(null)}
          receiverId={requestTarget.userId}
          receiverName={requestTarget.displayName}
          receiverAvatar={requestTarget.photos[0]}
        />
      )}
    </div>
  );
}

