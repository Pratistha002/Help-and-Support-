export const CALLBACK_STATUSES = [
  { id: "PENDING", label: "Pending", color: "#f59e0b" },
  { id: "CONNECTED", label: "Connected", color: "#3b82f6" },
  { id: "NOT_CONNECTED", label: "Not Connected", color: "#ef4444" },
  { id: "RESOLVED", label: "Resolved", color: "#10b981" },
] as const;

export type CallbackStatus = (typeof CALLBACK_STATUSES)[number]["id"];

/** Legacy DB values still shown in admin UI. */
const LEGACY_STATUS_LABELS: Record<string, string> = { COMPLETED: "Resolved" };
const LEGACY_STATUS_COLORS: Record<string, string> = { COMPLETED: "#10b981" };

export function callbackStatusLabel(status: string): string {
  if (LEGACY_STATUS_LABELS[status]) return LEGACY_STATUS_LABELS[status];
  return CALLBACK_STATUSES.find((s) => s.id === status)?.label || status;
}

export function callbackStatusColor(status: string): string {
  if (LEGACY_STATUS_COLORS[status]) return LEGACY_STATUS_COLORS[status];
  return CALLBACK_STATUSES.find((s) => s.id === status)?.color || "#64748b";
}

export function normalizeCallbackStatus(status: string): CallbackStatus | string {
  if (status === "COMPLETED") return "RESOLVED";
  return status;
}

/** Display id for a callback queue entry — not a support ticket until admin creates one. */
export function callbackReference(callbackId: string | { _id?: string; id?: string }): string {
  const id = typeof callbackId === "string" ? callbackId : String(callbackId._id || callbackId.id || "");
  return `CB-${id.slice(-6).toUpperCase()}`;
}
