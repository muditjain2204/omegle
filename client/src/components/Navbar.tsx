"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Video,
  MessageSquare,
  Heart,
  Mail,
  User as UserIcon,
  Crown,
  Shield,
  Sparkles,
  LogOut,
  Settings,
  LogIn,
  UserPlus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { getCurrentUser, UserProfile, clearToken } from "@/lib/api";
import AuthModal from "@/components/AuthModal";

interface NavbarProps {
  onOpenPricing?: () => void;
  onOpenQuickStart?: (mode?: "video" | "text") => void;
  hideMobileBottomBar?: boolean;
}

export default function Navbar({ onOpenPricing, onOpenQuickStart, hideMobileBottomBar = false }: NavbarProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [isBottomBarHidden, setIsBottomBarHidden] = useState(false);

  useEffect(() => {
    getCurrentUser().then((u) => setUser(u));
  }, [pathname]);

  const navLinks = [
    { href: "/video", label: "Video Chat", icon: Video, badge: "Free" },
    { href: "/text", label: "Text Chat", icon: MessageSquare, badge: "Free" },
    { href: "/dating", label: "Dating", icon: Heart, badge: "15 Free" },
    { href: "/messages", label: "Messages", icon: Mail },
    { href: "/dashboard", label: "Dashboard", icon: UserIcon },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <Video className="h-4 w-4" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
                  Omegle<span className="text-blue-600">Plus</span>
                </span>
                <span className="text-[9px] font-medium tracking-wide text-slate-400 block -mt-1">
                  PREMIUM SOCIAL DISCOVERY
                </span>
              </div>
            </Link>

            {/* Online Counter Badge */}
            <div className="hidden md:flex items-center gap-2 ml-4 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              14,290 Online
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-0.5 sm:gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              const targetHref = user ? link.href : `/auth?redirect=${encodeURIComponent(link.href)}`;
              return (
                <Link
                  key={link.href}
                  href={targetHref}
                  className={`relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    isActive
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? "text-blue-400" : "text-slate-500"}`} />
                  <span>{link.label}</span>
                  {link.badge && (
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                        isActive
                          ? "bg-blue-500/30 text-blue-200"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right CTA / User State */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Admin Link if admin */}
            <Link
              href="/admin"
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors shrink-0"
            >
              <Shield className="h-3 w-3 text-slate-600" />
              Admin
            </Link>

            {/* Pricing Button */}
            <Link
              href="/pricing"
              className="flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-semibold shadow-sm hover:from-amber-600 hover:to-amber-700 transition-all hover:shadow shrink-0"
            >
              <Crown className="h-3.5 w-3.5 text-amber-100" />
              <span>Get Premium</span>
            </Link>

            {/* User profile / Quick Start */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 hover:opacity-90 transition-opacity"
                >
                  {user.profile?.avatarUrl ? (
                    <img
                      src={user.profile.avatarUrl}
                      alt={user.profile.displayName}
                      className="h-7 w-7 rounded-full border border-slate-300 object-cover"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                      {user.profile?.displayName?.charAt(0) || "U"}
                    </div>
                  )}
                  <div className="hidden sm:block text-left">
                    <div className="text-xs font-semibold text-slate-800 leading-none">
                      {user.profile?.displayName || "Guest"}
                    </div>
                    <div className="text-[10px] text-emerald-600 font-medium">Active</div>
                  </div>
                </Link>
                <button
                  onClick={() => {
                    clearToken();
                    setUser(null);
                    window.location.reload();
                  }}
                  title="Switch Guest / Log Out"
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-md transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setIsAuthOpen(true);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all shadow-sm cursor-pointer shrink-0"
                >
                  <LogIn className="h-3 w-3 text-slate-500" />
                  <span>Log In</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("register");
                    setIsAuthOpen(true);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow transition-all cursor-pointer shrink-0"
                >
                  <UserPlus className="h-3 w-3 text-blue-100" />
                  <span>Sign Up</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar - Compact and Collapsible */}
      {!hideMobileBottomBar && (
        isBottomBarHidden ? (
          <button
            type="button"
            onClick={() => setIsBottomBarHidden(false)}
            className="lg:hidden fixed bottom-1.5 left-1/2 -translate-x-1/2 z-40 px-3 py-1 rounded-full bg-slate-900/90 text-white text-[10px] font-semibold backdrop-blur-md shadow-lg border border-slate-700 flex items-center gap-1 hover:bg-slate-800 transition-all cursor-pointer"
            title="Show Navigation Bar"
          >
            <ChevronUp className="h-3 w-3" />
            <span>Show Menu</span>
          </button>
        ) : (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-11 sm:h-12 bg-white/95 backdrop-blur-md border-t border-slate-200/90 flex items-center justify-around px-1.5 shadow-md">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              const targetHref = user ? link.href : `/auth?redirect=${encodeURIComponent(link.href)}`;
              return (
                <Link
                  key={link.href}
                  href={targetHref}
                  className={`flex flex-col items-center justify-center py-0.5 px-2 rounded-lg transition-colors ${
                    isActive ? "text-blue-600 font-bold" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-[9px] sm:text-[10px] leading-tight mt-0.5">{link.label}</span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setIsBottomBarHidden(true)}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
              title="Minimize Navigation Bar"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      )}

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        mode={authMode}
        onSuccess={() => {
          getCurrentUser().then((u) => setUser(u));
          setIsAuthOpen(false);
        }}
      />
    </>
  );
}

