"use client";

import React, { useState } from "react";
import { X, AlertTriangle, Shield, Check } from "lucide-react";
import { submitReport, blockUser } from "@/lib/api";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
  targetUserName?: string;
  onReportSuccess?: () => void;
}

export default function ReportModal({
  isOpen,
  onClose,
  targetUserId,
  targetUserName = "User",
  onReportSuccess,
}: ReportModalProps) {
  const [reason, setReason] = useState("INAPPROPRIATE_BEHAVIOR");
  const [details, setDetails] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await submitReport({
        reportedUserId: targetUserId,
        reason,
        details,
      });

      if (alsoBlock) {
        await blockUser(targetUserId);
      }

      setSuccess(true);
      if (onReportSuccess) onReportSuccess();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to submit report");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overscroll-contain"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-red-500/10 border-b border-red-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>Report & Safety Notice</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Report Received</h3>
            <p className="text-xs text-slate-600">
              Thank you for keeping our community safe. Our moderation team has been dispatched to review this user.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <p className="text-xs text-slate-600">
              You are submitting a safety report for <strong>{targetUserName}</strong>. We take abusive or hostile behavior very seriously.
            </p>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs font-semibold">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for report
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="INAPPROPRIATE_BEHAVIOR">Inappropriate or vulgar behavior</option>
                <option value="UNDERAGE">Suspected minor (under 18 years old)</option>
                <option value="HARASSMENT">Harassment or hostile language</option>
                <option value="SPAM">Commercial spam or advertising</option>
                <option value="OTHER">Other violation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Details (optional)
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Describe what occurred..."
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={alsoBlock}
                onChange={(e) => setAlsoBlock(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-xs text-slate-700 font-medium">
                Immediately block this user from matching with me again
              </span>
            </label>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

