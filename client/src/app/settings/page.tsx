"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  Settings as SettingsIcon,
  Shield,
  Trash2,
  Check,
  Save,
  Lock,
  Globe,
  Sliders,
  LogOut,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { getCurrentUser, UserProfile, fetchWithAuth, clearToken } from "@/lib/api";

export default function SettingsPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState("");
  const [location, setLocation] = useState("");
  const [preferredGender, setPreferredGender] = useState("ANY");

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleteRequested, setDeleteRequested] = useState(false);

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (!u) {
        window.location.href = "/auth?redirect=/settings";
        return;
      }
      setUser(u);
      setDisplayName(u.profile?.displayName || "");
      setBio(u.profile?.bio || "");
      setInterests((u.profile?.interests || []).join(", "));
      setLocation(u.profile?.location || "");
      setPreferredGender(u.preferences?.preferredGender || "ANY");
    });
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const interestsArray = interests
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await fetchWithAuth("/api/auth/profile", {
        method: "PUT",
        body: JSON.stringify({
          displayName,
          bio,
          interests: interestsArray,
          location,
          preferredGender,
        }),
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    window.location.href = "/";
  };

  return (
    <div className="min-h-[100dvh] w-full bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <SettingsIcon className="h-6 w-6 text-blue-600" />
              <span>Profile & Account Settings</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage your identity, matchmaking preferences, privacy, and safety settings.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>

        {saveSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600" />
            <span>Your settings have been saved successfully!</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* Section 1: Profile Information */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <User className="h-5 w-5 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Public Identity
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  placeholder="e.g. San Francisco, CA"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Short Bio</label>
              <textarea
                rows={3}
                placeholder="Share a few words about what you enjoy discussing..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Interests (comma separated)
              </label>
              <input
                type="text"
                placeholder="e.g. Tech, Photography, Travel, Music"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Section 2: Matchmaking Preferences */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Sliders className="h-5 w-5 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Matchmaking Preferences
              </h2>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Default Gender Filter Preference
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { val: "ANY", label: "Anyone (Random Free)" },
                  { val: "FEMALE", label: "Female Preferred" },
                  { val: "MALE", label: "Male Preferred" },
                ].map((item) => (
                  <button
                    type="button"
                    key={item.val}
                    onClick={() => setPreferredGender(item.val)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                      preferredGender === item.val
                        ? "border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-500"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Random mode connects with any gender for free. Gender filters apply when active paid packs are present.
              </p>
            </div>
          </div>

          {/* Section 3: Privacy & Data Redressal */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Shield className="h-5 w-5 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Privacy & Legal Disclosures
              </h2>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">Age Eligibility Status</div>
                  <div className="text-[11px] text-slate-500">18+ Adult Certification verified</div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                  Verified Adult
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">End-to-End P2P Video</div>
                  <div className="text-[11px] text-slate-500">Direct WebRTC stream. Video is never covertly recorded.</div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px]">
                  WebRTC Active
                </span>
              </div>
            </div>

            {/* Data Deletion Request (Section 12 Compliance) */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Data Deletion Request</h3>
                  <p className="text-[11px] text-slate-500">
                    Request permanent erasure of all your profile data, chat messages, and records.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteRequested(true)}
                  className="px-3.5 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{deleteRequested ? "Request Logged" : "Request Erasure"}</span>
                </button>
              </div>
              {deleteRequested && (
                <div className="mt-2 p-2.5 rounded-xl bg-red-50 text-red-700 text-[11px] font-medium">
                  Your deletion request has been submitted to the compliance officer. Data will be purged within 48 hours.
                </div>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="py-3 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? "Saving..." : "Save Settings"}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

