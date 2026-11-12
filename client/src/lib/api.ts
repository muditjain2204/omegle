export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  profile?: {
    displayName: string;
    age: number;
    gender: "MALE" | "FEMALE" | "NON_BINARY" | "OTHER" | "ANY";
    avatarUrl?: string;
    bio?: string;
    interests?: string[];
    location?: string;
  };
  trialEntitlement?: {
    videoTrialTotalMinutes: number;
    videoTrialUsedSeconds: number;
    textTrialTotalMinutes: number;
    textTrialUsedSeconds: number;
  };
  usageBalance?: {
    paidVideoSecondsAvailable: number;
    paidTextSecondsAvailable: number;
    datingPremiumExpiresAt?: string | null;
  };
  preferences?: {
    preferredGender: string;
    videoGenderFilter: string;
    textGenderFilter: string;
  };
  datingProfile?: {
    headline?: string;
    bio?: string;
    photos: string[];
    interests: string[];
  };
  mutualMatchesCount?: number;
  isDatingPremium?: boolean;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("omegle_token");
}

export function setToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("omegle_token", token);
  }
}

export function clearToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("omegle_token");
    localStorage.removeItem("omegle_user");
  }
}

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "An error occurred while fetching data");
  }
  return data;
}

// Quick Start (Instant Guest / User initialization)
export async function quickStartUser(payload: {
  displayName?: string;
  gender?: string;
  targetGender?: string;
  isAdult: boolean;
}) {
  const res = await fetch(`${API_BASE_URL}/api/auth/quick-start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to start");
  setToken(data.token);
  if (typeof window !== "undefined") {
    localStorage.setItem("omegle_user", JSON.stringify(data.user));
  }
  return data;
}

// Get current user profile & balances
export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    const data = await fetchWithAuth("/api/auth/me");
    if (typeof window !== "undefined") {
      localStorage.setItem("omegle_user", JSON.stringify(data.user));
    }
    return data.user;
  } catch (err) {
    return null;
  }
}

// Dating API
export async function getDatingProfiles(filters?: {
  gender?: string;
  minAge?: number;
  maxAge?: number;
  city?: string;
  intention?: string;
  interest?: string;
}) {
  const query = new URLSearchParams();
  if (filters?.gender && filters.gender !== "ALL") query.append("gender", filters.gender);
  if (filters?.minAge) query.append("minAge", filters.minAge.toString());
  if (filters?.maxAge) query.append("maxAge", filters.maxAge.toString());
  if (filters?.city) query.append("city", filters.city);
  if (filters?.intention && filters.intention !== "ANY") query.append("intention", filters.intention);
  if (filters?.interest) query.append("interest", filters.interest);

  const qs = query.toString();
  return fetchWithAuth(`/api/dating/discover${qs ? `?${qs}` : ""}`);
}

export async function likeProfile(targetUserId: string, isSuperLike = false) {
  return fetchWithAuth("/api/dating/like", {
    method: "POST",
    body: JSON.stringify({ targetUserId, isSuperLike }),
  });
}

export async function passProfile(targetUserId: string) {
  return fetchWithAuth("/api/dating/pass", {
    method: "POST",
    body: JSON.stringify({ targetUserId }),
  });
}

export async function getLikesYou() {
  return fetchWithAuth("/api/dating/likes-you");
}

export async function getMatches() {
  return fetchWithAuth("/api/dating/matches");
}

export async function unmatchUser(targetUserId: string) {
  return fetchWithAuth("/api/dating/unmatch", {
    method: "POST",
    body: JSON.stringify({ targetUserId }),
  });
}

export async function getDatingProfile() {
  return fetchWithAuth("/api/dating/profile");
}

export async function updateDatingProfile(data: {
  displayName?: string;
  age?: number;
  gender?: string;
  location?: string;
  headline?: string;
  bio?: string;
  photos?: string[];
  interests?: string[];
  relationshipIntention?: string;
  interestedIn?: string;
}) {
  return fetchWithAuth("/api/dating/profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function getDatingNotifications() {
  return fetchWithAuth("/api/dating/notifications");
}

export async function markNotificationsRead() {
  return fetchWithAuth("/api/dating/notifications/read", {
    method: "POST",
  });
}

// Messages API
export async function getMessageRequests() {
  return fetchWithAuth("/api/messages/requests");
}

export async function sendMessageRequest(receiverId: string, messageText: string) {
  return fetchWithAuth("/api/messages/requests/send", {
    method: "POST",
    body: JSON.stringify({ receiverId, messageText }),
  });
}

export async function respondMessageRequest(requestId: string, action: "accept" | "reject") {
  return fetchWithAuth(`/api/messages/requests/${requestId}/respond`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}

export async function getConversations() {
  return fetchWithAuth("/api/messages/conversations");
}

export async function getConversationMessages(id: string) {
  return fetchWithAuth(`/api/messages/conversations/${id}/messages`);
}

export async function sendConversationMessage(id: string, content: string) {
  return fetchWithAuth(`/api/messages/conversations/${id}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

// Payments API
export async function getProducts() {
  const res = await fetch(`${API_BASE_URL}/api/payments/products`);
  return res.json();
}

export async function createPaymentOrder(productType: string) {
  return fetchWithAuth("/api/payments/create-order", {
    method: "POST",
    body: JSON.stringify({ productType }),
  });
}

export async function verifyPayment(
  purchaseId: string,
  razorpayPaymentId?: string,
  razorpayOrderId?: string,
  razorpaySignature?: string
) {
  return fetchWithAuth("/api/payments/verify", {
    method: "POST",
    body: JSON.stringify({ purchaseId, razorpayPaymentId, razorpayOrderId, razorpaySignature }),
  });
}

export async function getPaymentGatewayStatus() {
  const res = await fetch(`${API_BASE_URL}/api/payments/gateway-status`);
  return res.json();
}

export async function getPaymentHistory() {
  return fetchWithAuth("/api/payments/history");
}

// Safety API
export async function submitReport(payload: {
  reportedUserId: string;
  reason: string;
  details?: string;
}) {
  return fetchWithAuth("/api/safety/report", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function blockUser(blockedId: string) {
  return fetchWithAuth("/api/safety/block", {
    method: "POST",
    body: JSON.stringify({ blockedId }),
  });
}

// Admin API
export async function getAdminOverview() {
  return fetchWithAuth("/api/admin/overview");
}

export async function getAdminReports() {
  return fetchWithAuth("/api/admin/reports");
}

export async function actOnReport(reportId: string, action: "ban" | "dismiss", notes?: string) {
  return fetchWithAuth(`/api/admin/reports/${reportId}/action`, {
    method: "POST",
    body: JSON.stringify({ action, notes }),
  });
}

// Redeem VIP / Friend Promo Code
export async function redeemPromoCode(code: string) {
  return fetchWithAuth("/api/payments/redeem-code", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

// Admin: Grant VIP Access to user by email
export async function grantUserVip(email: string, passType: string = "FULL_VIP", customMinutes?: number) {
  return fetchWithAuth("/api/admin/grant-vip", {
    method: "POST",
    body: JSON.stringify({ email, passType, customMinutes }),
  });
}

// Live real-time online count
export async function getOnlineCount(): Promise<number> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/stats/online`);
    const data = await res.json();
    return typeof data.count === "number" ? data.count : 0;
  } catch (e) {
    return 0;
  }
}

