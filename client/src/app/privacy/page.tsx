"use client";

import React from "react";
import Link from "next/link";
import { Shield, ArrowLeft, Lock, Trash2, Eye, FileText, CheckCircle2 } from "lucide-react";
import Navbar from "@/components/Navbar";

export default function PrivacyPage() {
  return (
    <div className="min-h-[100dvh] w-full bg-slate-50 text-slate-800 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </Link>

        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-sm space-y-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
              <Shield className="h-3.5 w-3.5" />
              <span>DPDP Act (2023) & GDPR Transparent Disclosures</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              Privacy Policy & Data Protection
            </h1>
            <p className="text-xs text-slate-500">
              Last updated: November 2026 • Effective for all OmeglePlus Users
            </p>
          </div>

          <div className="space-y-6 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-6">
            <section className="space-y-2">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Lock className="h-4 w-4 text-emerald-600" />
                1. Peer-to-Peer Encryption & Call Architecture
              </h2>
              <p>
                Video and audio streams are established directly between participants via WebRTC peer-to-peer (P2P) connections. OmeglePlus does not record, intercept, or store live video or audio streams on centralized servers.
              </p>
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
                <strong>Important Notice:</strong> While OmeglePlus does not record calls, we cannot guarantee that remote participants will not attempt external screen captures. Always exercise discretion regarding what personal information you share on camera.
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-600" />
                2. Information We Collect
              </h2>
              <ul className="list-disc pl-5 space-y-1 text-slate-700">
                <li>
                  <strong>Anonymous Quick-Start Sessions:</strong> Ephemeral session tokens, voluntary nickname, voluntary age verification, and transient socket IDs.
                </li>
                <li>
                  <strong>Registered Profiles:</strong> Email address, hashed password, display name, gender, preferences, and voluntary profile photos.
                </li>
                <li>
                  <strong>Billing Data:</strong> Order IDs, product packages, and transaction timestamps processed through verified payment gateways (we never store raw credit card credentials).
                </li>
                <li>
                  <strong>Safety & Audit Logs:</strong> User reports, timestamps of reports, and hashed IP addresses retained for a maximum of 90 days for law enforcement and abuse prevention purposes.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-red-600" />
                3. Your Rights & Data Erasure (Right to Be Forgotten)
              </h2>
              <p>
                You have the absolute right to view, export, or permanently delete your account and associated profile data at any time. You can initiate instant automated account deletion directly from your account settings:
              </p>
              <div className="pt-1">
                <Link
                  href="/settings"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-colors shadow-sm"
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  <span>Go to Data Deletion & Privacy Settings</span>
                </Link>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-600" />
                4. Grievance Officer & Legal Inquiries
              </h2>
              <p>
                In accordance with applicable digital personal data protection laws, our designated Grievance Officer responds to all inquiries, report escalations, and compliance requests within 24–48 business hours.
              </p>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
                <div><strong>Officer Name:</strong> Grievance Redressal Officer</div>
                <div><strong>Email:</strong> <a href="mailto:safety@omegleplus.local" className="text-blue-600 underline">safety@omegleplus.local</a></div>
                <div><strong>Response SLA:</strong> Within 48 hours for general inquiries, immediate for emergency safety escalation.</div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

