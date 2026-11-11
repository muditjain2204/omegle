"use client";

import React from "react";
import Link from "next/link";
import { Shield, ArrowLeft, CheckCircle2 } from "lucide-react";
import Navbar from "@/components/Navbar";

export default function TermsPage() {
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
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              Terms of Service & Community Guidelines
            </h1>
            <p className="text-xs text-slate-500">
              Last updated: November 2026 • Strict 18+ Adult Policy
            </p>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-6">
            <h2 className="text-base font-bold text-slate-900">1. Age Requirement (Strictly 18+)</h2>
            <p>
              OmeglePlus is exclusively accessible to adults aged 18 years or older. Anyone under the age of 18 is strictly prohibited from using or creating an account on this platform. Misrepresentation of age constitutes a breach of contract and will result in permanent ban and reporting where applicable.
            </p>

            <h2 className="text-base font-bold text-slate-900">2. Prohibited Conduct</h2>
            <p>
              Users must maintain respectful conduct at all times. The following are strictly banned:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-700">
              <li>Public nudity, sexual acts, or broadcasting non-consensual sexual content.</li>
              <li>Harassment, hate speech, bullying, defamation, or threatening language.</li>
              <li>Impersonation, scamming, commercial advertising, or distribution of malware.</li>
              <li>Attempting to record other participants without their explicit verifiable consent.</li>
            </ul>

            <h2 className="text-base font-bold text-slate-900">3. Freemium Model & Paid Balance Safeguards</h2>
            <p>
              Random video and text interactions are 100% free under fair-use safeguards. Preferred gender filtering and dating access past 15 mutual matches are paid packs. Paid minutes are deducted exclusively for active connected call time and do not expire.
            </p>

            <h2 className="text-base font-bold text-slate-900">4. Grievance Officer & Contact</h2>
            <p>
              For urgent safety reports, harassment complaints, or legal inquiries, our designated Grievance Officer can be contacted at: <strong className="text-slate-900">safety@omegleplus.local</strong>.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

