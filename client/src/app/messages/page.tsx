"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mail,
  Send,
  Check,
  X,
  User,
  Heart,
  MessageCircle,
  Clock,
  ShieldAlert,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import {
  getConversations,
  getMessageRequests,
  respondMessageRequest,
  getConversationMessages,
  sendConversationMessage,
  getCurrentUser,
  UserProfile,
} from "@/lib/api";

export default function MessagesPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<"conversations" | "requests">("conversations");

  const [conversations, setConversations] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);

  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const u = await getCurrentUser();
      if (!u) {
        window.location.href = "/auth?redirect=/messages";
        return;
      }
      setUser(u);

      const convRes = await getConversations();
      setConversations(convRes.conversations || []);
      if (convRes.conversations && convRes.conversations.length > 0 && !selectedConversation) {
        selectConv(convRes.conversations[0]);
      }

      const reqRes = await getMessageRequests();
      setIncomingRequests(reqRes.incoming || []);
      setSentRequests(reqRes.sent || []);
    } catch (e) {
      console.error(e);
    }
  };

  const selectConv = async (conv: any) => {
    setSelectedConversation(conv);
    setIsLoadingMessages(true);
    try {
      const res = await getConversationMessages(conv.id);
      setMessages(res.messages || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConversation) return;

    const content = messageInput.trim();
    setMessageInput("");

    try {
      const res = await sendConversationMessage(selectedConversation.id, content);
      setMessages((prev) => [...prev, res.message]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRespondRequest = async (requestId: string, action: "accept" | "reject") => {
    try {
      await respondMessageRequest(requestId, action);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 pb-20 lg:pb-6 flex flex-col md:flex-row gap-6">
        {/* Left Panel: Conversations & Request Tabs */}
        <div className="w-full md:w-80 bg-white rounded-3xl border border-slate-200/90 shadow-lg flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-slate-100">
            <h1 className="text-lg font-bold text-slate-900 mb-3">Messages</h1>
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => setActiveTab("conversations")}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "conversations"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Chats ({conversations.length})
              </button>
              <button
                onClick={() => setActiveTab("requests")}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all relative ${
                  activeTab === "requests"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span>Requests</span>
                {incomingRequests.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px]">
                    {incomingRequests.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-slate-100">
            {activeTab === "conversations" ? (
              conversations.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <MessageCircle className="h-8 w-8 mx-auto text-slate-300" />
                  <p className="text-xs">No active chats yet. Match on Dating or accept requests to begin chatting!</p>
                </div>
              ) : (
                conversations.map((c) => {
                  const isSelected = selectedConversation?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => selectConv(c)}
                      className={`w-full p-4 text-left flex items-center gap-3 transition-colors ${
                        isSelected ? "bg-blue-50/70 border-l-4 border-blue-600" : "hover:bg-slate-50"
                      }`}
                    >
                      <img
                        src={c.partner?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"}
                        alt={c.partner?.displayName}
                        className="h-10 w-10 rounded-full object-cover shrink-0 border border-slate-200"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold text-slate-900 truncate">
                            {c.partner?.displayName}
                          </h3>
                          {c.isDatingMatch && (
                            <Heart className="h-3 w-3 text-rose-500 fill-rose-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {c.lastMessage?.content || "Tap to chat"}
                        </p>
                      </div>
                    </button>
                  );
                })
              )
            ) : (
              <div className="p-4 space-y-4">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Incoming Requests
                </div>
                {incomingRequests.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No incoming message requests</p>
                ) : (
                  incomingRequests.map((r) => (
                    <div
                      key={r.id}
                      className="p-3 rounded-2xl border border-slate-200 bg-slate-50 space-y-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <img
                          src={r.sender?.avatarUrl || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100"}
                          alt="Sender"
                          className="h-7 w-7 rounded-full object-cover"
                        />
                        <span className="text-xs font-bold text-slate-900">{r.sender?.displayName}</span>
                      </div>
                      <p className="text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200">
                        &quot;{r.messageText}&quot;
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleRespondRequest(r.id, "accept")}
                          className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm"
                        >
                          <Check className="h-3.5 w-3.5" /> Accept
                        </button>
                        <button
                          onClick={() => handleRespondRequest(r.id, "reject")}
                          className="flex-1 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-xs flex items-center justify-center gap-1"
                        >
                          <X className="h-3.5 w-3.5" /> Decline
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Conversation Thread */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200/90 shadow-xl flex flex-col overflow-hidden" style={{ minHeight: "650px" }}>
          {selectedConversation ? (
            <>
              {/* Header */}
              <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedConversation.partner?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"}
                    alt="Partner"
                    className="h-10 w-10 rounded-full object-cover border border-slate-200"
                  />
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      {selectedConversation.partner?.displayName}
                    </h2>
                    <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span>Direct Chat (Free)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages Thread */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto overscroll-contain space-y-3 bg-slate-50/40">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <span className="h-6 w-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-slate-400 py-12 text-xs">
                    Start this conversation! Type a message below.
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.senderId === user?.id;
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                            isMe
                              ? "bg-blue-600 text-white rounded-br-sm"
                              : "bg-white text-slate-800 border border-slate-200 rounded-bl-sm"
                          }`}
                        >
                          {m.content}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 px-1">
                          {new Date(m.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <form
                onSubmit={handleSendMessage}
                className="p-4 border-t border-slate-100 bg-white flex items-center gap-3"
              >
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  className="flex-1 bg-slate-100 rounded-2xl px-4 py-2.5 text-xs text-slate-800 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim()}
                  className="p-3 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white shadow transition-all shrink-0"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
              <Mail className="h-10 w-10 text-slate-300" />
              <h3 className="text-sm font-bold text-slate-700">No conversation selected</h3>
              <p className="text-xs max-w-xs">
                Select a conversation from the left sidebar or accept an incoming message request to chat.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

