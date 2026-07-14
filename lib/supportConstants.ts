import type { GuestUser } from "./auth";

export const CONSUMER_TYPES = [
  { id: "EMPLOYEE", label: "Employee", description: "Role prep, tests & InterviewX" },
  { id: "MANAGER", label: "Manager", description: "Team monitoring & invites" },
  { id: "HR", label: "HR", description: "Company-wide workforce view" },
  { id: "ADMIN", label: "Admin", description: "Platform & org settings" },
];

export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "Saarthiworkforce@gmail.com";
export const SUPPORT_PHONE_DISPLAY = process.env.NEXT_PUBLIC_SUPPORT_PHONE_DISPLAY || "+1 878 732 2485";
export const SUPPORT_PHONE_E164 = process.env.NEXT_PUBLIC_SUPPORT_PHONE_E164 || "+18787322485";
export const SUPPORT_PHONE_TEL = `tel:${SUPPORT_PHONE_E164.replace(/\s/g, "")}`;

export const LIVE_AGENT_OFFER_AFTER_EXCHANGES = 3;
export const LIVE_AGENT_OFFER_TITLE = "Query not listed?";
export const LIVE_AGENT_OFFER_BODY =
  "If your query isn't in our list, connect with a live support agent for personalised help.";
export const LIVE_AGENT_CONNECT_MODAL_TITLE = "Connect with a live agent?";
export const LIVE_AGENT_CONNECT_MODAL_BODY =
  "Your conversation will be sent to our support team. When an agent accepts, you can continue right here.";
export const LIVE_AGENT_OFFER_PRIMARY_LABEL = "Connect to live agent";
export const LIVE_AGENT_OFFER_DISMISS_LABEL = "Continue with AI";

export const HELP_CHANNEL_CARDS = [
  { id: "LIVE_CHAT", label: "Live chat", badge: "Chat · Available now", icon: "💬", tint: "#dbeafe", accent: "#3b82f6" },
  { id: "EMAIL", label: "Email support", badge: SUPPORT_EMAIL, icon: "✉️", tint: "#fef3c7", accent: "#f59e0b" },
  { id: "CALL", label: "Request a call", badge: SUPPORT_PHONE_DISPLAY, icon: "📞", tint: "#ffedd5", accent: "#f97316" },
  { id: "TICKET", label: "Create Ticket", badge: "Submit a ticket", icon: "📝", tint: "#e0e7ff", accent: "#6366f1" },
  { id: "TRACK", label: "Track ticket", badge: "View your requests", icon: "🎫", tint: "#ecfdf5", accent: "#10b981" },
];

export const CHAT_SERVICES_BY_ROLE: Record<string, Array<{ id: string; label: string; desc: string }>> = {
  EMPLOYEE: [
    { id: "profile", label: "Profile & login", desc: "Account & first login" },
    { id: "talentx", label: "TalentX role prep", desc: "Target roles & skill gaps" },
    { id: "skill-test", label: "Skill tests", desc: "Assessments & certificates" },
    { id: "interviewx", label: "InterviewX", desc: "Interview practice" },
  ],
  MANAGER: [
    { id: "dashboard", label: "Manager dashboard", desc: "Team monitoring" },
    { id: "invite", label: "Bulk invite", desc: "Excel employee invites" },
    { id: "recommend", label: "Role recommendations", desc: "Suggest roles to team" },
    { id: "analytics", label: "Track analytics", desc: "Per-employee progress" },
  ],
  HR: [
    { id: "hr-view", label: "HR company view", desc: "All departments" },
    { id: "invite-hr", label: "Cross-dept invites", desc: "Bulk onboarding" },
    { id: "engagement", label: "Engagement metrics", desc: "Active vs dormant" },
    { id: "org", label: "Org structure", desc: "Departments & roles" },
  ],
  ADMIN: [
    { id: "admin", label: "Admin panel", desc: "Org settings" },
    { id: "docker", label: "Docker deploy", desc: "Stack & seeding" },
    { id: "api", label: "API & auth", desc: "Technical issues" },
    { id: "help-desk", label: "Help desk", desc: "Live agent admin" },
  ],
};

export function resolveConsumerType(user: GuestUser | null): string {
  if (!user) return "EMPLOYEE";
  if (user.accountType === "ADMIN") return "ADMIN";
  return user.currentRole || "EMPLOYEE";
}

export function wantsLiveAgent(message: string): boolean {
  const lower = message.toLowerCase().trim();
  return (
    /\b(live agent|live support|talk to agent|human agent|connect.*agent|live chat)\b/.test(lower) ||
    (/\b(agent|human)\b/.test(lower) && /\b(chat|talk|connect|want|need)\b/.test(lower))
  );
}
