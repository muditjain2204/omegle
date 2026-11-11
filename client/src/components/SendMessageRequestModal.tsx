"use client";

import React, { useState } from "react";
import { X, Send, Mail, Check } from "lucide-react";
import { sendMessageRequest } from "@/lib/api";

interface SendMessageRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiverId: string;
  receiverName: string;
  receiverAvatar?: string;
  onSuccess?: () => void;
}

export default function SendMessageRequestModal({
  isOpen,
  onClose,
  receiverId,
  receiverName,
  receiverAvatar,
  onSuccess,
}: SendMessageRequestModalProps) {
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    setIsSending(true);
    setError(null);

    try {
      await sendMessageRequest(receiverId, messageText.trim());
      setSuccess(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setSuccess(false);
        setMessageText("");
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to send message request");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overscroll-contain"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in">
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-100 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800">Send Message Request</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {success ? (
          <div className="p-6 text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">Request Delivered!</h4>
            <p className="text-xs text-slate-500">
              When {receiverName} accepts your request, a direct conversation will unlock in your inbox.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSend} className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <img
                src={receiverAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"}
                alt={receiverName}
                className="h-10 w-10 rounded-full object-cover border border-slate-200 shadow-sm"
              />
              <div>
                <div className="text-xs font-bold text-slate-900">{receiverName}</div>
                <div className="text-[10px] text-slate-400">Direct message request</div>
              </div>
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs font-semibold">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Your Note
              </label>
              <textarea
                required
                rows={3}
                placeholder={`Hi ${receiverName}, I came across your profile and would love to connect!`}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="py-2 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSending || !messageText.trim()}
                className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow flex items-center gap-1.5 transition-all"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSending ? "Sending..." : "Send Request"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

