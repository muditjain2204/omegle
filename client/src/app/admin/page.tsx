"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  Users,
  Video,
  MessageSquare,
  Heart,
  IndianRupee,
  AlertTriangle,
  CheckCircle,
  Ban,
  UserCheck,
  Eye,
  Lock,
  KeyRound,
  LogOut,
  Gift,
  Crown,
  Sparkles,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { getAdminOverview, getAdminReports, actOnReport, fetchWithAuth, grantUserVip, API_BASE_URL } from "@/lib/api";

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Friend VIP Grant Form States
  const [friendEmail, setFriendEmail] = useState("");
  const [friendPassType, setFriendPassType] = useState("FULL_VIP");
  const [isGrantingVip, setIsGrantingVip] = useState(false);
  const [vipGrantSuccess, setVipGrantSuccess] = useState<string | null>(null);
  const [vipGrantError, setVipGrantError] = useState<string | null>(null);

  // Admin login form states
  const [adminEmail, setAdminEmail] = useState("muditjain2204@gmail.com");
  const [adminPassword, setAdminPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setIsLoading(true);
    setLoginError(null);
    try {
      const data = await getAdminOverview();
      setMetrics(data.metrics);
      const rep = await getAdminReports();
      setReports(rep.reports || []);
      setIsAdminLoggedIn(true);
    } catch (err: any) {
      setIsAdminLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      if (data.user?.role !== "ADMIN") {
        throw new Error("Access Denied: This account does not possess administrator privileges.");
      }

      localStorage.setItem("omegle_token", data.token);
      setIsAdminLoggedIn(true);

      const overview = await getAdminOverview();
      setMetrics(overview.metrics);
      const rep = await getAdminReports();
      setReports(rep.reports || []);
    } catch (err: any) {
      setLoginError(err.message || "Failed to authenticate as administrator.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAdminSignOut = () => {
    localStorage.removeItem("omegle_token");
    setIsAdminLoggedIn(false);
    setMetrics(null);
    setReports([]);
  };

  const handleAction = async (reportId: string, action: "ban" | "dismiss") => {
    try {
      const res = await actOnReport(reportId, action, `Moderator action taken on ${new Date().toLocaleTimeString()}`);
      setActionMessage(res.message || "Report updated");
      loadAdminData();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (e: any) {
      alert(e.message || "Failed to take action");
    }
  };

  const handleGrantVip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendEmail.trim()) return;
    setIsGrantingVip(true);
    setVipGrantError(null);
    setVipGrantSuccess(null);

    try {
      const res = await grantUserVip(friendEmail.trim(), friendPassType);
      setVipGrantSuccess(res.message);
      setFriendEmail("");
      loadAdminData();
      setTimeout(() => setVipGrantSuccess(null), 5000);
    } catch (err: any) {
      setVipGrantError(err.message || "Failed to grant VIP privileges.");
    } finally {
      setIsGrantingVip(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] w-full bg-slate-900 flex flex-col font-sans text-slate-100">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-500 border-t-transparent" />
          <p className="text-xs text-slate-400">Verifying administrative access...</p>
        </div>
      </div>
    );
  }

  if (!isAdminLoggedIn) {
    return (
      <div className="min-h-[100dvh] w-full bg-slate-950 flex flex-col font-sans text-slate-100">
        <Navbar />

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
                <Shield className="h-6 w-6" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold">
                <Lock className="h-3 w-3" /> Secure Administrator Gate
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Admin Portal Authentication
              </h1>
              <p className="text-xs text-slate-400">
                Administrative credentials required to view platform metrics, live sessions, and safety reports.
              </p>
            </div>

            {loginError && (
              <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Admin Email
                </label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="muditjain2204@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoggingIn ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" />
                    <span>Authenticate & Access Portal</span>
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-2 border-t border-slate-800/80">
              <span className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
                <Lock className="h-3 w-3 text-slate-500" />
                <span>Restricted to authorized system administrators only</span>
              </span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-slate-800">
              <Shield className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-black tracking-tight">Admin & Moderation Portal</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Platform telemetry, gender distribution, active calls, and safety enforcement.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              System Online
            </span>
            <button
              onClick={handleAdminSignOut}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-300 bg-white hover:bg-red-50 hover:text-red-700 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Admin Sign Out</span>
            </button>
          </div>
        </div>

        {actionMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
            {actionMessage}
          </div>
        )}

        {/* METRICS GRID (Exact to prompt.md section 11) */}
        {metrics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>Total Users</span>
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{metrics.totalUsers}</div>
              <div className="text-[11px] text-emerald-600 font-medium">
                {metrics.onlineUsers} currently online
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>Active Video Sessions</span>
                <Video className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{metrics.activeVideoSessions}</div>
              <div className="text-[11px] text-slate-500">
                WebRTC P2P streams
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>Dating Matches</span>
                <Heart className="h-4 w-4 text-rose-500" />
              </div>
              <div className="text-2xl font-black text-slate-900">{metrics.totalMatches}</div>
              <div className="text-[11px] text-slate-500">
                Mutual swipe connections
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-amber-200 shadow-sm space-y-1 bg-gradient-to-b from-amber-50/20 to-white">
              <div className="flex items-center justify-between text-amber-800 text-xs font-semibold">
                <span>Total Revenue</span>
                <IndianRupee className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">₹{metrics.totalRevenueRupees}</div>
              <div className="text-[11px] text-amber-700 font-medium">
                {metrics.totalPurchasesCount} transactions processed
              </div>
            </div>
          </div>
        )}

        {/* Gender Distribution breakdown */}
        {metrics && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900">
              Gender Distribution (Voluntarily Provided Profile Data)
            </h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-100">
                <div className="text-xs text-blue-700 font-semibold">Male Users</div>
                <div className="text-xl font-black text-blue-900 mt-1">{metrics.maleCount}</div>
              </div>
              <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-100">
                <div className="text-xs text-rose-700 font-semibold">Female Users</div>
                <div className="text-xl font-black text-rose-900 mt-1">{metrics.femaleCount}</div>
              </div>
              <div className="p-4 rounded-2xl bg-purple-50/80 border border-purple-100">
                <div className="text-xs text-purple-700 font-semibold">Other / Non-Binary</div>
                <div className="text-xl font-black text-purple-900 mt-1">{metrics.otherCount}</div>
              </div>
            </div>
          </div>
        )}

        {/* VIP / Friends Access Grant Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-200/80 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Gift className="h-5 w-5 text-amber-500" />
                <span>Grant Free VIP & Friend Privileges</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Gift unlimited preferred video/text minutes and premium dating passes to your friends or specific accounts.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
              Instant Account Top-Up
            </span>
          </div>

          <form onSubmit={handleGrantVip} className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
            <div className="sm:col-span-6">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Friend's Account Email
              </label>
              <input
                type="email"
                required
                value={friendEmail}
                onChange={(e) => setFriendEmail(e.target.value)}
                placeholder="friend@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50/50"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Access Package
              </label>
              <select
                value={friendPassType}
                onChange={(e) => setFriendPassType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              >
                <option value="FULL_VIP">🌟 Full VIP Bundle (500h Video + 500h Text + 1y Dating)</option>
                <option value="VIDEO">📹 Preferred Video Pack (500 Hours)</option>
                <option value="TEXT">💬 Preferred Text Pack (500 Hours)</option>
                <option value="DATING">❤️ 1-Year Premium Dating Pass</option>
              </select>
            </div>

            <div className="sm:col-span-2 flex items-end">
              <button
                type="submit"
                disabled={isGrantingVip || !friendEmail.trim()}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isGrantingVip ? (
                  <span className="h-4 w-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Grant VIP</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {vipGrantSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{vipGrantSuccess}</span>
            </div>
          )}
          {vipGrantError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-300 text-red-700 text-xs font-semibold">
              {vipGrantError}
            </div>
          )}
        </div>

        {/* Moderation Reports Table */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span>Safety & Moderation Queue</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review reported interactions, take swift disciplinary actions, or suspend accounts.
              </p>
            </div>
          </div>

          {reports.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              All clear! No pending safety reports.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Time</th>
                    <th className="p-3">Reporter</th>
                    <th className="p-3">Reported User</th>
                    <th className="p-3">Reason</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reports.map((r) => (
                    <tr key={r.id}>
                      <td className="p-3 text-slate-500">
                        {new Date(r.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="p-3 font-semibold text-slate-800">
                        {r.reporter?.profile?.displayName || "Anonymous"}
                      </td>
                      <td className="p-3 font-bold text-red-700">
                        {r.reportedUser?.profile?.displayName || "Reported User"}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                          {r.reason}
                        </span>
                        {r.details && (
                          <div className="text-[11px] text-slate-500 mt-0.5 italic">
                            &quot;{r.details}&quot;
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="text-[11px] font-semibold text-slate-700">
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3">
                        {r.status === "PENDING" ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleAction(r.id, "ban")}
                              className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-sm"
                            >
                              <Ban className="h-3 w-3" /> Ban
                            </button>
                            <button
                              onClick={() => handleAction(r.id, "dismiss")}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-[10px]"
                            >
                              Dismiss
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            {r.actionTaken || "Resolved"}
                          </span>
                        )}
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
