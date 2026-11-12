"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Heart,
  X,
  Sparkles,
  MapPin,
  ShieldCheck,
  Crown,
  MessageCircle,
  ArrowRight,
  Zap,
  Mail,
  Filter,
  Bell,
  User as UserIcon,
  Users,
  Compass,
  Check,
  ChevronLeft,
  ChevronRight,
  Smile,
  Send,
  Video,
  PhoneOff,
  Sliders,
  Plus,
  Trash2,
  Calendar,
  Flame,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import confetti from "canvas-confetti";
import Navbar from "@/components/Navbar";
import PricingModal from "@/components/PricingModal";
import SendMessageRequestModal from "@/components/SendMessageRequestModal";
import {
  getDatingProfiles,
  likeProfile,
  passProfile,
  getLikesYou,
  getMatches,
  unmatchUser,
  getDatingProfile,
  updateDatingProfile,
  getDatingNotifications,
  markNotificationsRead,
  getCurrentUser,
  getConversationMessages,
  sendConversationMessage,
  UserProfile,
} from "@/lib/api";

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
  relationshipIntention?: string;
  verifiedBadge?: boolean;
}

interface MatchItem {
  matchId: string;
  matchedAt: string;
  conversationId?: string;
  partner: {
    id: string;
    displayName: string;
    avatarUrl?: string;
    age?: number;
    gender?: string;
    location?: string;
    bio?: string;
    headline?: string;
    photos: string[];
    interests: string[];
    relationshipIntention?: string;
    isOnline?: boolean;
  };
}

interface LikeReceivedItem {
  likeId: string;
  isSuperLike: boolean;
  createdAt: string;
  user: DatingCard;
}

interface DatingNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  metadata?: any;
  createdAt: string;
}

const PRESET_INTERESTS = [
  "Music",
  "Travel",
  "Movies",
  "Gaming",
  "Cooking",
  "Fitness",
  "Tech",
  "Art",
  "Photography",
  "Books",
  "Nature",
  "Yoga",
  "Coffee",
  "Startups",
  "Design",
  "Dance",
];

export default function DatingPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<"discover" | "likes" | "matches" | "profile">("discover");
  const [isLoading, setIsLoading] = useState(true);

  // Discover state
  const [profiles, setProfiles] = useState<DatingCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [mutualMatchesCount, setMutualMatchesCount] = useState(0);
  const [isDatingPremium, setIsDatingPremium] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  // Likes You state
  const [likesReceived, setLikesReceived] = useState<LikeReceivedItem[]>([]);
  const [likesLoading, setLikesLoading] = useState(false);

  // Matches & Chat state
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchItem | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Profile Edit state
  const [profileForm, setProfileForm] = useState({
    displayName: "",
    age: 21,
    gender: "OTHER",
    interestedIn: "Everyone",
    location: "",
    headline: "",
    bio: "",
    photos: [] as string[],
    interests: [] as string[],
    relationshipIntention: "Casual Dating",
  });
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState<string | null>(null);

  // Filters state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    gender: "ALL",
    minAge: 18,
    maxAge: 50,
    city: "",
    intention: "ANY",
    interest: "",
  });

  // Notifications state
  const [notifications, setNotifications] = useState<DatingNotification[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Modals
  const [matchedPartner, setMatchedPartner] = useState<DatingCard | null>(null);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [requestTarget, setRequestTarget] = useState<DatingCard | null>(null);

  // 1-on-1 Video Call with Match state
  const [isVideoCalling, setIsVideoCalling] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    initDating();
  }, []);

  const initDating = async () => {
    setIsLoading(true);
    try {
      const u = await getCurrentUser();
      if (!u) {
        window.location.href = "/auth?redirect=/dating";
        return;
      }
      setUser(u);

      await Promise.all([
        loadDiscoverProfiles(u.id),
        loadNotifications(),
        loadLikesYou(),
        loadMatchesList(),
        loadMyProfile(),
      ]);
    } catch (err) {
      console.error("Dating init error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDiscoverProfiles = async (myUserId?: string, customFilters?: any) => {
    try {
      const res = await getDatingProfiles(customFilters || filters);
      const uid = myUserId || user?.id;
      // Never show current user's profile in discovery
      const cleanList = (res.profiles || []).filter((p: DatingCard) => p.userId !== uid);
      setProfiles(cleanList);
      setCurrentIndex(0);
      setCurrentPhotoIndex(0);
      setMutualMatchesCount(res.mutualMatchesCount || 0);
      setIsDatingPremium(Boolean(res.isDatingPremium));
      if (res.mutualMatchesCount >= 15 && !res.isDatingPremium) {
        setLimitReached(true);
      } else {
        setLimitReached(false);
      }
    } catch (err: any) {
      if (err.message && err.message.includes("limit reached")) {
        setLimitReached(true);
      }
    }
  };

  const loadLikesYou = async () => {
    setLikesLoading(true);
    try {
      const data = await getLikesYou();
      setLikesReceived(data.likes || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLikesLoading(false);
    }
  };

  const loadMatchesList = async () => {
    setMatchesLoading(true);
    try {
      const data = await getMatches();
      setMatches(data.matches || []);
    } catch (e) {
      console.error(e);
    } finally {
      setMatchesLoading(false);
    }
  };

  const loadMyProfile = async () => {
    try {
      const data = await getDatingProfile();
      if (data.profile) {
        setProfileForm({
          displayName: data.profile.displayName || "",
          age: data.profile.age || 21,
          gender: data.profile.gender || "OTHER",
          interestedIn: data.profile.interestedIn || "Everyone",
          location: data.profile.location || "",
          headline: data.profile.headline || "",
          bio: data.profile.bio || "",
          photos: data.profile.photos || [],
          interests: data.profile.interests || [],
          relationshipIntention: data.profile.relationshipIntention || "Casual Dating",
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadNotifications = async () => {
    try {
      const data = await getDatingNotifications();
      setNotifications(data.notifications || []);
      setUnreadNotifCount(data.unreadCount || 0);
    } catch (e) {
      console.error(e);
    }
  };

  // Like or Super Like
  const handleLike = async (isSuperLike = false, overrideTarget?: DatingCard) => {
    const target = overrideTarget || profiles[currentIndex];
    if (!target) return;

    try {
      const res = await likeProfile(target.userId, isSuperLike);

      if (res.limitReached) {
        setLimitReached(true);
        setIsPricingOpen(true);
        return;
      }

      if (res.mutualMatch) {
        setMatchedPartner(target);
        setMutualMatchesCount(res.mutualMatchesCount || mutualMatchesCount + 1);
        loadMatchesList();

        try {
          confetti({
            particleCount: 110,
            spread: 75,
            origin: { y: 0.6 },
          });
        } catch (e) {}
      }

      // If called from Likes You list, remove that entry
      if (overrideTarget) {
        setLikesReceived((prev) => prev.filter((l) => l.user.userId !== overrideTarget.userId));
      } else {
        setCurrentIndex((prev) => prev + 1);
        setCurrentPhotoIndex(0);
      }
    } catch (err: any) {
      if (err.message && err.message.includes("limit")) {
        setLimitReached(true);
        setIsPricingOpen(true);
      }
    }
  };

  // Pass profile
  const handlePass = async (overrideTarget?: DatingCard) => {
    const target = overrideTarget || profiles[currentIndex];
    if (!target) return;

    try {
      await passProfile(target.userId);
    } catch (e) {}

    if (overrideTarget) {
      setLikesReceived((prev) => prev.filter((l) => l.user.userId !== overrideTarget.userId));
    } else {
      setCurrentIndex((prev) => prev + 1);
      setCurrentPhotoIndex(0);
    }
  };

  // Open Chat with a Match
  const handleSelectMatch = async (match: MatchItem) => {
    setSelectedMatch(match);
    if (match.conversationId) {
      try {
        const msgs = await getConversationMessages(match.conversationId);
        setChatMessages(msgs.messages || []);
      } catch (e) {
        setChatMessages([]);
      }
    } else {
      setChatMessages([]);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedMatch?.conversationId) return;

    setIsSendingMessage(true);
    try {
      const sent = await sendConversationMessage(selectedMatch.conversationId, chatInput.trim());
      setChatMessages((prev) => [...prev, sent.message]);
      setChatInput("");
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Unmatch a partner
  const handleUnmatch = async (partnerId: string) => {
    if (!confirm("Are you sure you want to unmatch? This conversation will be removed.")) return;
    try {
      await unmatchUser(partnerId);
      setSelectedMatch(null);
      loadMatchesList();
    } catch (e) {
      console.error(e);
    }
  };

  // Save Profile Form
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSaveSuccess(null);

    try {
      await updateDatingProfile(profileForm);
      setProfileSaveSuccess("🎉 Dating profile updated successfully!");
      setTimeout(() => setProfileSaveSuccess(null), 3000);
      loadMyProfile();
    } catch (err: any) {
      alert(err.message || "Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAddPhoto = () => {
    if (!newPhotoUrl.trim()) return;
    if (profileForm.photos.length >= 6) {
      alert("You can add at most 6 photos.");
      return;
    }
    setProfileForm((prev) => ({
      ...prev,
      photos: [...prev.photos, newPhotoUrl.trim()],
    }));
    setNewPhotoUrl("");
  };

  const handleRemovePhoto = (idx: number) => {
    setProfileForm((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== idx),
    }));
  };

  const handleToggleInterest = (interest: string) => {
    setProfileForm((prev) => {
      const exists = prev.interests.includes(interest);
      return {
        ...prev,
        interests: exists
          ? prev.interests.filter((i) => i !== interest)
          : [...prev.interests, interest],
      };
    });
  };

  // Handle Mark Notifications Read
  const handleOpenNotifications = async () => {
    setIsNotifOpen((prev) => !prev);
    if (!isNotifOpen && unreadNotifCount > 0) {
      try {
        await markNotificationsRead();
        setUnreadNotifCount(0);
      } catch (e) {}
    }
  };

  // Apply & Reset Filters
  const handleApplyFilters = () => {
    setIsFilterOpen(false);
    loadDiscoverProfiles(user?.id, filters);
  };

  const handleResetFilters = () => {
    const defaultFilters = {
      gender: "ALL",
      minAge: 18,
      maxAge: 50,
      city: "",
      intention: "ANY",
      interest: "",
    };
    setFilters(defaultFilters);
    setIsFilterOpen(false);
    loadDiscoverProfiles(user?.id, defaultFilters);
  };

  const currentCard = profiles[currentIndex];

  return (
    <div className="min-h-[100dvh] w-full bg-slate-50 flex flex-col font-sans">
      <Navbar onOpenPricing={() => setIsPricingOpen(true)} />

      {/* DATING TOP BAR & NAVIGATION */}
      <header className="sticky top-14 z-30 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          {/* Section Brand Pill */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white shadow-sm shadow-rose-500/20">
              <Heart className="h-4 w-4 fill-white" />
            </div>
            <div className="hidden sm:block">
              <span className="text-sm font-black tracking-tight text-slate-900 flex items-center gap-1">
                Dating<span className="text-rose-500">Discovery</span>
              </span>
              <span className="text-[9px] font-semibold text-slate-400 block -mt-1">
                100% MUTUAL MATCHING
              </span>
            </div>
          </div>

          {/* Navigation Tabs (Discover, Likes You, Matches, My Profile) */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab("discover")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "discover"
                  ? "bg-rose-500 text-white shadow-sm shadow-rose-500/20"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Discover</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("likes");
                loadLikesYou();
              }}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "likes"
                  ? "bg-rose-500 text-white shadow-sm shadow-rose-500/20"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Heart className="h-3.5 w-3.5 fill-current" />
              <span>Likes You</span>
              {likesReceived.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black">
                  {likesReceived.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab("matches");
                loadMatchesList();
              }}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "matches"
                  ? "bg-rose-500 text-white shadow-sm shadow-rose-500/20"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>Matches</span>
              {matches.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black">
                  {matches.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("profile")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "profile"
                  ? "bg-rose-500 text-white shadow-sm shadow-rose-500/20"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <UserIcon className="h-3.5 w-3.5" />
              <span>My Profile</span>
            </button>
          </nav>

          {/* Right Action Icons (Filters, Notifications Bell, Free/Premium Counter) */}
          <div className="flex items-center gap-1.5">
            {/* Filter Toggle */}
            <button
              onClick={() => setIsFilterOpen(true)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer relative"
              title="Filters & Preferences"
            >
              <Sliders className="h-4 w-4" />
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={handleOpenNotifications}
                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer relative"
                title="Dating Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadNotifCount > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
                )}
              </button>

              {/* Notification Popover Dropdown */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white border border-slate-200 shadow-2xl p-4 z-50 animate-in fade-in">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-900">Notifications</span>
                    <span className="text-[10px] text-slate-500">{notifications.length} recent</span>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 py-1">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            setIsNotifOpen(false);
                            if (n.type === "SUPER_LIKE" || n.type === "LIKE") {
                              setActiveTab("likes");
                            } else if (n.type === "MATCH") {
                              setActiveTab("matches");
                            }
                          }}
                          className="py-2.5 px-1 hover:bg-slate-50 transition-colors cursor-pointer rounded-lg text-left"
                        >
                          <div className="text-xs font-bold text-slate-900">{n.title}</div>
                          <div className="text-[11px] text-slate-600 mt-0.5 leading-snug">{n.body}</div>
                          <div className="text-[9px] text-slate-400 mt-1">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Free/Premium Match Badge */}
            <div
              onClick={() => !isDatingPremium && setIsPricingOpen(true)}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border cursor-pointer ${
                isDatingPremium
                  ? "bg-amber-50 border-amber-200 text-amber-800"
                  : mutualMatchesCount >= 15
                  ? "bg-rose-50 border-rose-200 text-rose-700"
                  : "bg-emerald-50 border-emerald-200 text-emerald-800"
              }`}
            >
              {isDatingPremium ? (
                <>
                  <Crown className="h-3 w-3 text-amber-600" />
                  <span>VIP Unlimited</span>
                </>
              ) : (
                <>
                  <span>Free Matches:</span>
                  <span className="font-extrabold">{mutualMatchesCount}/15</span>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 pb-20 flex flex-col items-center">
        {/* ================= TAB 1: DISCOVER ================= */}
        {activeTab === "discover" && (
          <div className="w-full flex flex-col items-center">
            {/* Free Limit Warning Banner */}
            {limitReached && !isDatingPremium && (
              <div className="w-full max-w-md mb-6 p-5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg space-y-2 text-center animate-in fade-in">
                <Crown className="h-6 w-6 mx-auto text-amber-200" />
                <h3 className="text-base font-extrabold">You reached your 15 Free Mutual Matches!</h3>
                <p className="text-xs text-amber-100 leading-relaxed">
                  Upgrade to <strong>Dating Premium</strong> for ₹499 for 7 days of unlimited discovery and swipes. Your existing matches remain free forever!
                </p>
                <button
                  onClick={() => setIsPricingOpen(true)}
                  className="mt-2 px-5 py-2.5 rounded-xl bg-white text-amber-800 font-bold text-xs shadow hover:bg-amber-50 transition-colors cursor-pointer"
                >
                  Unlock 7-Day Dating Pass (₹499)
                </button>
              </div>
            )}

            {/* Profile Swipe Card Stack */}
            {isLoading ? (
              <div className="w-full max-w-md h-[540px] rounded-3xl bg-white border border-slate-200 shadow-xl flex flex-col items-center justify-center p-8 space-y-4">
                <div className="h-10 w-10 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin" />
                <p className="text-xs font-semibold text-slate-500">Finding curated discovery profiles...</p>
              </div>
            ) : currentCard && (!limitReached || isDatingPremium) ? (
              <div className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-2xl transition-all">
                {/* Photo Gallery Area with Carousel Controls */}
                <div className="relative h-[390px] w-full bg-slate-900 overflow-hidden select-none">
                  <img
                    src={
                      currentCard.photos[currentPhotoIndex] ||
                      currentCard.photos[0] ||
                      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80"
                    }
                    alt={currentCard.displayName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                  {/* Photo Indicators bar */}
                  {currentCard.photos.length > 1 && (
                    <div className="absolute top-3 left-4 right-4 flex gap-1 z-10">
                      {currentCard.photos.map((_, i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all ${
                            i === currentPhotoIndex ? "bg-white" : "bg-white/40"
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Photo Navigation Click Zones */}
                  {currentCard.photos.length > 1 && (
                    <>
                      {currentPhotoIndex > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentPhotoIndex((prev) => prev - 1);
                          }}
                          className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors z-10"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                      )}
                      {currentPhotoIndex < currentCard.photos.length - 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentPhotoIndex((prev) => prev + 1);
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors z-10"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      )}
                    </>
                  )}

                  {/* Badges in Photo */}
                  <div className="absolute top-4 right-4 flex flex-col gap-1.5 items-end">
                    {currentCard.verifiedBadge && (
                      <div className="px-2.5 py-1 rounded-full bg-blue-500/80 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 shadow-sm">
                        <ShieldCheck className="h-3 w-3" />
                        <span>18+ Verified</span>
                      </div>
                    )}
                    {currentCard.relationshipIntention && (
                      <div className="px-2.5 py-0.5 rounded-full bg-rose-500/80 backdrop-blur-md text-white text-[10px] font-bold shadow-sm">
                        {currentCard.relationshipIntention}
                      </div>
                    )}
                  </div>

                  {/* Identity on Photo */}
                  <div className="absolute bottom-4 left-5 right-5 text-white">
                    <div className="flex items-baseline gap-2">
                      <h2 className="text-2xl font-black tracking-tight">{currentCard.displayName}</h2>
                      <span className="text-xl font-light text-slate-300">{currentCard.age}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-300 mt-0.5">
                      <MapPin className="h-3.5 w-3.5 text-rose-400" />
                      <span>{currentCard.location || "Nearby"}</span>
                    </div>
                  </div>
                </div>

                {/* Profile Details & Interests */}
                <div className="p-5 space-y-4">
                  {currentCard.headline && (
                    <div className="text-xs font-semibold text-slate-800 italic">
                      &quot;{currentCard.headline}&quot;
                    </div>
                  )}

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {currentCard.bio}
                  </p>

                  {/* Interests Chips */}
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

                  {/* Tinder/Hinge Action Buttons */}
                  <div className="pt-3 flex items-center justify-center gap-5 border-t border-slate-100">
                    {/* Pass button */}
                    <button
                      onClick={() => handlePass()}
                      className="p-4 rounded-full border-2 border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm active:scale-95 cursor-pointer"
                      title="Pass"
                    >
                      <X className="h-7 w-7" />
                    </button>

                    {/* Super Like button */}
                    <button
                      onClick={() => handleLike(true)}
                      className="p-3.5 rounded-full border-2 border-amber-300 text-amber-500 hover:bg-amber-50 transition-all shadow-sm active:scale-95 cursor-pointer"
                      title="Super Like (Sends Special Alert)"
                    >
                      <Zap className="h-6 w-6" />
                    </button>

                    {/* Direct Note button */}
                    <button
                      onClick={() => setRequestTarget(currentCard)}
                      className="p-3.5 rounded-full border-2 border-blue-200 text-blue-500 hover:bg-blue-50 transition-all shadow-sm active:scale-95 cursor-pointer"
                      title="Send Direct Note"
                    >
                      <Mail className="h-6 w-6" />
                    </button>

                    {/* Like button (Heart) */}
                    <button
                      onClick={() => handleLike(false)}
                      className="p-4 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/25 hover:from-rose-600 hover:to-pink-600 transition-all active:scale-95 cursor-pointer"
                      title="Send Heart (Like)"
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
                  You have reviewed all available profiles for your current filters. Adjust your filters or check the &quot;Likes You&quot; tab!
                </p>
                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    onClick={() => setIsFilterOpen(true)}
                    className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                  >
                    Adjust Filters
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab("likes");
                      loadLikesYou();
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow"
                  >
                    See Who Liked You
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: LIKES YOU ================= */}
        {activeTab === "likes" && (
          <div className="w-full max-w-3xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">People Who Liked You</h2>
                <p className="text-xs text-slate-500">
                  Like them back to create an instant mutual match and unlock private chat!
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold">
                {likesReceived.length} {likesReceived.length === 1 ? "Admirer" : "Admirers"}
              </span>
            </div>

            {likesLoading ? (
              <div className="py-20 text-center text-xs text-slate-400">Loading incoming likes...</div>
            ) : likesReceived.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-sm">
                <div className="h-14 w-14 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                  <Heart className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold text-slate-800">No New Likes Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Keep swiping on Discover or enhance your profile photos and bio to attract more likes!
                </p>
                <button
                  onClick={() => setActiveTab("discover")}
                  className="px-5 py-2.5 rounded-xl bg-rose-500 text-white text-xs font-bold shadow hover:bg-rose-600"
                >
                  Start Discovering
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {likesReceived.map((item) => (
                  <div
                    key={item.likeId}
                    className="relative bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-md hover:shadow-lg transition-all flex flex-col justify-between"
                  >
                    {/* Super Like Banner */}
                    {item.isSuperLike && (
                      <div className="absolute top-3 left-3 right-3 z-10 px-2 py-1 rounded-full bg-amber-500 text-white text-[10px] font-black tracking-wider uppercase flex items-center justify-center gap-1 shadow">
                        <Zap className="h-3 w-3 fill-white" />
                        <span>Sent You a Super Like!</span>
                      </div>
                    )}

                    {/* Image */}
                    <div className="relative h-64 w-full bg-slate-900">
                      <img
                        src={item.user.photos[0] || item.user.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400"}
                        alt={item.user.displayName}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute bottom-3 left-4 right-4 text-white">
                        <div className="font-bold text-base flex items-baseline gap-1.5">
                          <span>{item.user.displayName}</span>
                          <span className="font-light text-sm text-slate-300">{item.user.age}</span>
                        </div>
                        <div className="text-[11px] text-slate-300 flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-rose-400" />
                          <span>{item.user.location || "Nearby"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bio & Details */}
                    <div className="p-4 space-y-3">
                      {item.user.relationshipIntention && (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                          {item.user.relationshipIntention}
                        </span>
                      )}
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {item.user.bio || "Looking to meet someone genuine."}
                      </p>

                      {/* Actions: Like Back & Pass */}
                      <div className="pt-2 flex items-center gap-2">
                        <button
                          onClick={() => handlePass(item.user)}
                          className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                        >
                          Pass
                        </button>
                        <button
                          onClick={() => handleLike(false, item.user)}
                          className="flex-1 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold shadow hover:from-rose-600 hover:to-pink-600 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Heart className="h-3.5 w-3.5 fill-white" />
                          <span>Like Back</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: MATCHES & CHAT ================= */}
        {activeTab === "matches" && (
          <div className="w-full max-w-4xl bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[560px]">
            {/* Left Column: Matches List */}
            <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-200 p-4 flex flex-col">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Your Mutual Matches</span>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black">
                  {matches.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pt-2 max-h-96 md:max-h-[500px]">
                {matchesLoading ? (
                  <div className="py-12 text-center text-xs text-slate-400">Loading matches...</div>
                ) : matches.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                    <p>No matches yet.</p>
                    <p className="text-[11px] text-slate-500">
                      When both you and someone else like each other, you&apos;ll be able to chat here!
                    </p>
                  </div>
                ) : (
                  matches.map((m) => {
                    const isSelected = selectedMatch?.matchId === m.matchId;
                    return (
                      <div
                        key={m.matchId}
                        onClick={() => handleSelectMatch(m)}
                        className={`flex items-center gap-3 p-3 rounded-2xl transition-all cursor-pointer ${
                          isSelected ? "bg-rose-50 border border-rose-200" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="relative">
                          <img
                            src={m.partner.photos[0] || m.partner.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"}
                            alt={m.partner.displayName}
                            className="h-12 w-12 rounded-full object-cover border border-slate-200"
                          />
                          {m.partner.isOnline && (
                            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {m.partner.displayName}, {m.partner.age}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {m.partner.headline || m.partner.bio || "Matched on OmeglePlus"}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Chat Window or Details */}
            <div className="flex-1 flex flex-col justify-between bg-slate-50/50">
              {selectedMatch ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={selectedMatch.partner.photos[0] || selectedMatch.partner.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"}
                        alt={selectedMatch.partner.displayName}
                        className="h-10 w-10 rounded-full object-cover border"
                      />
                      <div>
                        <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <span>{selectedMatch.partner.displayName}, {selectedMatch.partner.age}</span>
                          {selectedMatch.partner.relationshipIntention && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-semibold border border-rose-200">
                              {selectedMatch.partner.relationshipIntention}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Matched on {new Date(selectedMatch.matchedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Video Call button */}
                      <button
                        onClick={() => setIsVideoCalling(true)}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                        title="Start 1-on-1 Video Call"
                      >
                        <Video className="h-3.5 w-3.5" />
                        <span>Video Call</span>
                      </button>

                      {/* Unmatch button */}
                      <button
                        onClick={() => handleUnmatch(selectedMatch.partner.id)}
                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
                        title="Unmatch user"
                      >
                        Unmatch
                      </button>
                    </div>
                  </div>

                  {/* Message History */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[380px]">
                    <div className="text-center py-2">
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-semibold">
                        Mutual Match active. Messages are end-to-end private.
                      </span>
                    </div>

                    {chatMessages.map((msg) => {
                      const isMe = msg.senderId === user?.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs ${
                              isMe
                                ? "bg-rose-500 text-white rounded-br-xs"
                                : "bg-white text-slate-800 border border-slate-200 rounded-bl-xs shadow-xs"
                            }`}
                          >
                            <p className="leading-relaxed">{msg.content}</p>
                            <span
                              className={`text-[9px] block text-right mt-1 ${
                                isMe ? "text-rose-200" : "text-slate-400"
                              }`}
                            >
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Chat Input form */}
                  <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={`Message ${selectedMatch.partner.displayName}...`}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    <button
                      type="submit"
                      disabled={isSendingMessage || !chatInput.trim()}
                      className="p-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white transition-all cursor-pointer"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-2">
                  <MessageCircle className="h-10 w-10 text-slate-300" />
                  <p className="text-xs font-semibold">Select a match on the left to start a conversation or video call!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 4: MY PROFILE (TINDER / HINGE SETUP) ================= */}
        {activeTab === "profile" && (
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xl space-y-6">
            <div>
              <h2 className="text-xl font-black text-slate-900">Your Dating Profile</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Setup your photos, bio, interests, and intentions so other users can discover you.
              </p>
            </div>

            {profileSaveSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>{profileSaveSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* 1. Photos Section (1 to 6 photos) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Profile Photos ({profileForm.photos.length}/6)
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {profileForm.photos.map((url, idx) => (
                    <div key={idx} className="relative h-24 rounded-2xl overflow-hidden border border-slate-200 group">
                      <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-red-600 transition-colors"
                        title="Remove photo"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}

                  {profileForm.photos.length < 6 && (
                    <div className="h-24 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center p-2 text-slate-400">
                      <Plus className="h-5 w-5 mb-1" />
                      <span className="text-[10px]">Add URL</span>
                    </div>
                  )}
                </div>

                {profileForm.photos.length < 6 && (
                  <div className="flex gap-2 pt-1">
                    <input
                      type="url"
                      value={newPhotoUrl}
                      onChange={(e) => setNewPhotoUrl(e.target.value)}
                      placeholder="Paste image URL (Unsplash, imgur, etc.)..."
                      className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddPhoto}
                      className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
                    >
                      Add Photo
                    </button>
                  </div>
                )}
              </div>

              {/* 2. Basic Info (Name, Age, Gender, Interested In) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.displayName}
                    onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Age (18+ only)
                  </label>
                  <input
                    type="number"
                    min={18}
                    max={99}
                    required
                    value={profileForm.age}
                    onChange={(e) => setProfileForm({ ...profileForm, age: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Your Gender
                  </label>
                  <select
                    value={profileForm.gender}
                    onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other / Non-Binary</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Interested In
                  </label>
                  <select
                    value={profileForm.interestedIn}
                    onChange={(e) => setProfileForm({ ...profileForm, interestedIn: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="Everyone">Everyone</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                  </select>
                </div>
              </div>

              {/* 3. Location / City & Intention */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    City / Location
                  </label>
                  <input
                    type="text"
                    value={profileForm.location}
                    onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                    placeholder="e.g. Mumbai, New York, London"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Relationship Intention
                  </label>
                  <select
                    value={profileForm.relationshipIntention}
                    onChange={(e) => setProfileForm({ ...profileForm, relationshipIntention: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="Friendship">Friendship</option>
                    <option value="Casual Dating">Casual Dating</option>
                    <option value="Serious Relationship">Serious Relationship</option>
                  </select>
                </div>
              </div>

              {/* 4. Headline & Bio (Max 300 characters) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Headline
                </label>
                <input
                  type="text"
                  value={profileForm.headline}
                  onChange={(e) => setProfileForm({ ...profileForm, headline: e.target.value })}
                  placeholder="e.g. Always looking for spontaneous adventures ✈️"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Bio (Max 300 Characters)
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {profileForm.bio.length}/300
                  </span>
                </div>
                <textarea
                  maxLength={300}
                  rows={3}
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  placeholder="Tell others what you love, your passions, and what makes you unique..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* 5. Interests Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Interests
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_INTERESTS.map((interest) => {
                    const isSelected = profileForm.interests.includes(interest);
                    return (
                      <button
                        type="button"
                        key={interest}
                        onClick={() => handleToggleInterest(interest)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? "bg-rose-500 text-white shadow-sm"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {interest}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingProfile}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-xs shadow-lg hover:from-rose-600 hover:to-pink-600 transition-all cursor-pointer"
              >
                {isSavingProfile ? "Saving Profile..." : "Save Dating Profile"}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* FILTER & PREFERENCES MODAL */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-rose-500" />
                <h3 className="text-sm font-bold text-slate-900">Discovery Filters</h3>
              </div>
              <button
                onClick={() => setIsFilterOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Gender
                </label>
                <select
                  value={filters.gender}
                  onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-rose-500"
                >
                  <option value="ALL">All Genders</option>
                  <option value="FEMALE">Female</option>
                  <option value="MALE">Male</option>
                  <option value="OTHER">Other / Non-Binary</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Min Age
                  </label>
                  <input
                    type="number"
                    min={18}
                    max={filters.maxAge}
                    value={filters.minAge}
                    onChange={(e) => setFilters({ ...filters, minAge: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Max Age
                  </label>
                  <input
                    type="number"
                    min={filters.minAge}
                    max={99}
                    value={filters.maxAge}
                    onChange={(e) => setFilters({ ...filters, maxAge: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  City / Location
                </label>
                <input
                  type="text"
                  value={filters.city}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                  placeholder="e.g. Mumbai, New York"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Relationship Intention
                </label>
                <select
                  value={filters.intention}
                  onChange={(e) => setFilters({ ...filters, intention: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                >
                  <option value="ANY">Any Intention</option>
                  <option value="Friendship">Friendship</option>
                  <option value="Casual Dating">Casual Dating</option>
                  <option value="Serious Relationship">Serious Relationship</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Interest keyword
                </label>
                <input
                  type="text"
                  value={filters.interest}
                  onChange={(e) => setFilters({ ...filters, interest: e.target.value })}
                  placeholder="e.g. Travel, Music"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Reset All
              </button>
              <button
                type="button"
                onClick={handleApplyFilters}
                className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MUTUAL MATCH CELEBRATION MODAL */}
      {matchedPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl border border-slate-200 space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <Heart className="h-8 w-8 fill-rose-600 animate-bounce" />
            </div>

            <h2 className="text-2xl font-black text-slate-900">It&apos;s a Mutual Match! 🎉</h2>
            <p className="text-xs text-slate-600">
              You and <strong>{matchedPartner.displayName}</strong> both liked each other! An accepted private conversation is now open.
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
              <button
                onClick={() => {
                  setMatchedPartner(null);
                  setActiveTab("matches");
                  loadMatchesList();
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-xs shadow hover:from-rose-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Open Chat with {matchedPartner.displayName}</span>
              </button>
              <button
                onClick={() => setMatchedPartner(null)}
                className="w-full py-2.5 rounded-2xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Keep Swiping
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1-on-1 VIDEO CALL MODAL */}
      {isVideoCalling && selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 text-white text-center space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-rose-500" />
                <span className="text-xs font-bold">1-on-1 Private Video Call</span>
              </div>
              <button
                onClick={() => setIsVideoCalling(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="py-8 space-y-4">
              <img
                src={selectedMatch.partner.photos[0] || selectedMatch.partner.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"}
                alt={selectedMatch.partner.displayName}
                className="h-28 w-28 rounded-full mx-auto object-cover border-4 border-rose-500 shadow-xl animate-pulse"
              />
              <div>
                <h3 className="text-xl font-black">{selectedMatch.partner.displayName}</h3>
                <p className="text-xs text-rose-400 mt-1">Calling {selectedMatch.partner.displayName}...</p>
              </div>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Connecting WebRTC peer stream. Once accepted, video and audio are peer-to-peer encrypted.
              </p>
            </div>

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setIsVideoCalling(false)}
                className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <PhoneOff className="h-4 w-4" />
                <span>End Call</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRICING MODAL */}
      <PricingModal
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
        highlightProduct="DATING_PASS_7D"
        onSuccess={() => {
          loadDiscoverProfiles();
        }}
      />

      {/* SEND DIRECT NOTE MODAL */}
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
