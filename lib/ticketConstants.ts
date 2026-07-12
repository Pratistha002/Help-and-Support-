export const TICKET_STATUSES = [
  { id: "OPEN", label: "Open", color: "#3b82f6", meaning: "New/unassigned tickets in the queue" },
  { id: "IN_PROGRESS", label: "In Progress", color: "#f59e0b", meaning: "Currently being handled" },
  { id: "PENDING", label: "Pending", color: "#8b5cf6", meaning: "On hold — waiting internally or for follow-up" },
  { id: "PENDING_WITH_USER", label: "Pending with User", color: "#0891b2", meaning: "Waiting for the customer to reply or take action" },
  { id: "ESCALATED", label: "Escalated", color: "#ef4444", meaning: "Needs technical/specialist attention" },
  { id: "RESOLVED", label: "Resolved", color: "#10b981", meaning: "Fixed, awaiting confirmation or closure" },
  { id: "CLOSED", label: "Closed", color: "#64748b", meaning: "Completed and archived" },
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number]["id"];

export const TICKET_CHANNELS = {
  EMAIL: "EMAIL",
  TICKET_FORM: "TICKET_FORM",
  LIVE_CHAT: "LIVE_CHAT",
  AI_CHAT: "AI_CHAT",
  ADMIN_RAISED: "ADMIN_RAISED",
  CALL: "CALL",
  SMS: "SMS",
} as const;

export function statusLabel(status: string): string {
  return TICKET_STATUSES.find((s) => s.id === status)?.label || status;
}

export function statusColor(status: string): string {
  return TICKET_STATUSES.find((s) => s.id === status)?.color || "#64748b";
}

export function channelLabel(channel: string): string {
  const map: Record<string, string> = {
    EMAIL: "Email",
    TICKET_FORM: "Form",
    LIVE_CHAT: "Live Chat",
    AI_CHAT: "AI Chat",
    ADMIN_RAISED: "Live Agent",
    CALL: "Call",
    SMS: "SMS",
  };
  return map[channel] || channel;
}
