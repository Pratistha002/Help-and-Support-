import { getAuthFromStorage } from "./auth";

function authHeaders(): HeadersInit {
  // Always use Help & Support JWT — never the workforce org token (different signer).
  const { token } = getAuthFromStorage();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function supportFetch(path: string, init?: RequestInit) {
  const res = await fetch(path, { ...init, headers: { ...authHeaders(), ...(init?.headers || {}) } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || err?.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export const supportApi = {
  guestSignup: (payload: { name: string; email: string; currentRole?: string }) =>
    supportFetch("/api/auth/guest/", { method: "POST", body: JSON.stringify(payload) }),
  adminLogin: (payload: { username: string; password: string }) =>
    supportFetch("/api/auth/admin/", { method: "POST", body: JSON.stringify(payload) }),
  helpAgentLogin: (payload: { name: string; email: string; password: string }) =>
    supportFetch("/api/auth/help-agent/", { method: "POST", body: JSON.stringify(payload) }),
  getFaqs: (consumerType?: string, search?: string) => {
    const params = new URLSearchParams();
    if (consumerType) params.set("consumerType", consumerType);
    if (search) params.set("search", search);
    const qs = params.toString();
    return supportFetch(`/api/support/faqs/${qs ? `?${qs}` : ""}`);
  },
  aiChat: (payload: object) =>
    supportFetch("/api/support/ai/chat/", { method: "POST", body: JSON.stringify(payload) }),
  emailInquiry: (payload: object) =>
    supportFetch("/api/support/email-inquiry/", { method: "POST", body: JSON.stringify(payload) }),
  createTicket: (payload: object) =>
    supportFetch("/api/support/tickets/", { method: "POST", body: JSON.stringify(payload) }),
  createGuestTicket: (payload: object) =>
    supportFetch("/api/support/tickets/guest/", { method: "POST", body: JSON.stringify(payload) }),
  getTickets: () => supportFetch("/api/support/tickets/"),
  lookupTickets: (email: string) =>
    supportFetch("/api/support/tickets/lookup/", { method: "POST", body: JSON.stringify({ email }) }),
  closeTicket: (id: string, payload: { reason?: string } = {}) =>
    supportFetch(`/api/support/tickets/${id}/close/`, { method: "POST", body: JSON.stringify(payload) }),
  closeGuestTicket: (id: string, payload: { email: string; reason?: string }) =>
    supportFetch(`/api/support/tickets/${id}/close/guest/`, { method: "POST", body: JSON.stringify(payload) }),
  liveChatRequest: (payload: object) =>
    supportFetch("/api/support/live-chat/request/", { method: "POST", body: JSON.stringify(payload) }),
  liveChatActiveSession: () => supportFetch("/api/support/live-chat/session/active/"),
  liveChatSession: (id: string) => supportFetch(`/api/support/live-chat/sessions/${id}/`),
  liveChatMessages: (id: string) => supportFetch(`/api/support/live-chat/sessions/${id}/messages/`),
  liveChatSend: (id: string, content: string) =>
    supportFetch(`/api/support/live-chat/sessions/${id}/messages/`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
  liveChatSeen: (id: string) =>
    supportFetch(`/api/support/live-chat/sessions/${id}/seen/`, { method: "POST", body: "{}" }),
  liveChatClose: (id: string) =>
    supportFetch(`/api/support/live-chat/sessions/${id}/close/`, { method: "POST", body: "{}" }),
  liveChatGetRating: (id: string) =>
    supportFetch(`/api/support/live-chat/sessions/${id}/rating/`),
  liveChatSubmitRating: (
    id: string,
    payload: { rating: number; comment?: string; tags?: string[] },
  ) =>
    supportFetch(`/api/support/live-chat/sessions/${id}/rating/`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  adminAgentsWithRatings: () => supportFetch("/api/support/admin/agents/"),
  adminLiveChatSessions: () => supportFetch("/api/support/admin/live-chat/sessions/"),
  adminLiveChatAccept: (id: string) =>
    supportFetch(`/api/support/admin/live-chat/sessions/${id}/accept/`, { method: "POST", body: "{}" }),
  adminLiveChatMessages: (id: string) =>
    supportFetch(`/api/support/admin/live-chat/sessions/${id}/messages/`),
  adminLiveChatSend: (id: string, content: string) =>
    supportFetch(`/api/support/admin/live-chat/sessions/${id}/messages/`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
  adminLiveChatTickets: (sessionId: string) =>
    supportFetch(`/api/support/admin/live-chat/sessions/${sessionId}/tickets/`),
  adminTickets: (opts?: { channel?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (opts?.channel) params.set("channel", opts.channel);
    if (opts?.status) params.set("status", opts.status);
    const qs = params.toString();
    return supportFetch(`/api/support/admin/tickets/${qs ? `?${qs}` : ""}`);
  },
  adminAgentRaisedTickets: () => supportFetch("/api/support/admin/tickets/?raisedByAgent=true"),
  adminTicketStats: () => supportFetch("/api/support/admin/tickets/stats/"),
  adminTicketDetail: (id: string) => supportFetch(`/api/support/admin/tickets/${id}/`),
  adminUpdateTicketStatus: (id: string, status: string, opts?: { notifyEmail?: boolean; notifySms?: boolean }) =>
    supportFetch(`/api/support/admin/tickets/${id}/`, {
      method: "PATCH",
      body: JSON.stringify({ status, ...opts }),
    }),
  adminAcceptTicket: (id: string) =>
    supportFetch(`/api/support/admin/tickets/${id}/accept/`, { method: "POST", body: "{}" }),
  adminTemplates: () => supportFetch("/api/support/admin/templates/"),
  adminSendEmail: (payload: object) =>
    supportFetch("/api/support/admin/email/send/", { method: "POST", body: JSON.stringify(payload) }),
  adminRaiseTicket: (payload: object) =>
    supportFetch("/api/support/admin/tickets/raise/", { method: "POST", body: JSON.stringify(payload) }),
  getSupportConfig: () => supportFetch("/api/support/config/"),
  getCallConfig: () => supportFetch("/api/support/calls/config/"),
  requestCall: (payload: object) =>
    supportFetch("/api/support/calls/request-call/", { method: "POST", body: JSON.stringify(payload) }),
  smsInquiry: (payload: object) =>
    supportFetch("/api/support/sms/inquiry/", { method: "POST", body: JSON.stringify(payload) }),
  adminCallbacks: (status?: string) => {
    const qs = status ? `?status=${status}` : "";
    return supportFetch(`/api/support/admin/callbacks/${qs}`);
  },
  adminUpdateCallback: (id: string, status: string) =>
    supportFetch("/api/support/admin/callbacks/", { method: "PATCH", body: JSON.stringify({ id, status }) }),
  adminInitiateCallback: (id: string, adminPhone: string, adminOnline = true) =>
    supportFetch("/api/support/admin/callbacks/call/", {
      method: "POST",
      body: JSON.stringify({ id, adminPhone, adminOnline, mode: "phone" }),
    }),
  adminSoftphoneCall: (id: string, adminIdentity: string, adminOnline = true) =>
    supportFetch("/api/support/admin/callbacks/call/", {
      method: "POST",
      body: JSON.stringify({ id, adminIdentity, adminOnline, mode: "softphone" }),
    }),
  adminVoiceToken: () => supportFetch("/api/support/admin/callbacks/voice-token/"),
  adminCallbackCallEvent: (payload: { callbackId: string; event: string; callSid?: string }) =>
    supportFetch("/api/support/admin/callbacks/call-event/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  adminRaiseCallTicket: (payload: object) =>
    supportFetch("/api/support/admin/callbacks/raise-ticket/", { method: "POST", body: JSON.stringify(payload) }),
  adminCustomerHistory: (opts: { phone?: string; email?: string }) => {
    const qs = new URLSearchParams();
    if (opts.phone) qs.set("phone", opts.phone);
    if (opts.email) qs.set("email", opts.email);
    const q = qs.toString();
    return supportFetch(`/api/support/admin/customers/history/${q ? `?${q}` : ""}`);
  },
  adminSendSms: (payload: object) =>
    supportFetch("/api/support/admin/sms/send/", { method: "POST", body: JSON.stringify(payload) }),
  adminTechnicalTeam: () => supportFetch("/api/support/admin/technical-team/"),
  adminTechnicalTeamAll: () => supportFetch("/api/support/admin/technical-team/?all=true"),
  adminCreateTechnicalMember: (payload: object) =>
    supportFetch("/api/support/admin/technical-team/", { method: "POST", body: JSON.stringify(payload) }),
  adminUpdateTechnicalMember: (id: string, payload: object) =>
    supportFetch(`/api/support/admin/technical-team/${id}/`, { method: "PUT", body: JSON.stringify(payload) }),
  adminDeleteTechnicalMember: (id: string) =>
    supportFetch(`/api/support/admin/technical-team/${id}/`, { method: "DELETE" }),
  adminTechnicalTeamTemplate: async () => {
    const { token } = getAuthFromStorage();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch("/api/support/admin/technical-team/template/", { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message || err?.error || `Request failed (${res.status})`);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "technical_team_template.xlsx";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
  adminImportTechnicalTeam: async (file: File) => {
    const { token } = getAuthFromStorage();
    const form = new FormData();
    form.append("file", file);
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch("/api/support/admin/technical-team/import/", {
      method: "POST",
      headers,
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message || err?.error || `Request failed (${res.status})`);
    }
    return res.json();
  },
  adminEscalateToTechnical: (ticketId: string, payload: { technicalMemberId: string; note?: string }) =>
    supportFetch(`/api/support/admin/tickets/${ticketId}/escalate/`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  adminNotifications: () => supportFetch("/api/support/admin/notifications/"),
  adminMarkNotificationRead: (id: string) =>
    supportFetch(`/api/support/admin/notifications/${id}/read/`, { method: "POST", body: "{}" }),
  adminMarkAllNotificationsRead: () =>
    supportFetch("/api/support/admin/notifications/read-all/", { method: "POST", body: "{}" }),
};
