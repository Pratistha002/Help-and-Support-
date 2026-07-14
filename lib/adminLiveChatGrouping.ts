export type LiveSession = {
  id: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  consumerType?: string;
  serviceLabel?: string;
  status?: string;
  initialMessage?: string;
  createdAt?: string;
  lastMessageAt?: string;
  unreadForAdmin?: number;
  assignedAdminName?: string;
  tickets?: Array<{ ticketNumber?: string }>;
};

export const CHAT_COLOR_PALETTE = [
  { bg: "#eef4fa", border: "#93b8d4", accent: "#3170a5", avatar: "#2c4f72" },
  { bg: "#ecfdf5", border: "#6ee7b7", accent: "#0d9488", avatar: "#14b8a6" },
  { bg: "#f0f7fc", border: "#7eb3d4", accent: "#1e3a5f", avatar: "#1e3a5f" },
  { bg: "#eff6ff", border: "#93c5fd", accent: "#2563eb", avatar: "#3b82f6" },
  { bg: "#f0fdfa", border: "#5eead4", accent: "#0f766e", avatar: "#14b8a6" },
  { bg: "#f8fafc", border: "#cbd5e1", accent: "#475569", avatar: "#64748b" },
  { bg: "#ecfeff", border: "#67e8f9", accent: "#0891b2", avatar: "#06b6d4" },
  { bg: "#e0f2fe", border: "#7dd3fc", accent: "#0284c7", avatar: "#0ea5e9" },
  { bg: "#f1f5f9", border: "#94a3b8", accent: "#334155", avatar: "#475569" },
  { bg: "#f0fdf4", border: "#86efac", accent: "#16a34a", avatar: "#22c55e" },
] as const;

export function getChatColorIndex(key?: string): number {
  if (!key) return 0;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash % CHAT_COLOR_PALETTE.length;
}

export function getChatColor(key?: string) {
  return CHAT_COLOR_PALETTE[getChatColorIndex(key)];
}

export function getChatInitials(name?: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

export type UserSessionGroup = {
  key: string;
  userName: string;
  userEmail: string;
  sessions: LiveSession[];
  dateGroups: Array<{ dateLabel: string; sessions: LiveSession[] }>;
  unreadTotal: number;
  hasPending: boolean;
  hasActive: boolean;
  latestAt: number;
};

const STATUS_ORDER: Record<string, number> = { PENDING: 0, ACTIVE: 1, CLOSED: 2, REJECTED: 3 };

export function sessionUserKey(session: LiveSession): string {
  return session.userId || session.userEmail || session.userName || session.id;
}

export function filterSessionsByStatus(sessions: LiveSession[], statusFilter: string): LiveSession[] {
  if (!statusFilter || statusFilter === "ALL") return sessions;
  if (statusFilter === "CLOSED") {
    return sessions.filter((s) => s.status === "CLOSED" || s.status === "REJECTED");
  }
  return sessions.filter((s) => s.status === statusFilter);
}

export function formatSessionDateLabel(iso?: string): string {
  if (!iso) return "Unknown date";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown date";
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export function formatSessionTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function sessionSortTime(session: LiveSession): number {
  return new Date(session.lastMessageAt || session.createdAt || 0).getTime();
}

export function groupSessionsByUser(sessions: LiveSession[]): UserSessionGroup[] {
  const map = new Map<string, UserSessionGroup>();

  for (const session of sessions) {
    const key = sessionUserKey(session);
    if (!map.has(key)) {
      map.set(key, {
        key,
        userName: session.userName || "Unknown user",
        userEmail: session.userEmail || "",
        sessions: [],
        dateGroups: [],
        unreadTotal: 0,
        hasPending: false,
        hasActive: false,
        latestAt: 0,
      });
    }
    const group = map.get(key)!;
    group.sessions.push(session);
    group.unreadTotal += session.unreadForAdmin || 0;
    if (session.status === "PENDING") group.hasPending = true;
    if (session.status === "ACTIVE") group.hasActive = true;
  }

  const groups = Array.from(map.values());
  for (const group of groups) {
    group.sessions.sort((a, b) => sessionSortTime(b) - sessionSortTime(a));
    const dateMap = new Map<string, LiveSession[]>();
    for (const s of group.sessions) {
      const label = formatSessionDateLabel(s.createdAt || s.lastMessageAt);
      if (!dateMap.has(label)) dateMap.set(label, []);
      dateMap.get(label)!.push(s);
    }
    group.dateGroups = Array.from(dateMap.entries()).map(([dateLabel, items]) => ({ dateLabel, sessions: items }));
    group.latestAt = sessionSortTime(group.sessions[0]);
  }

  groups.sort((a, b) => b.latestAt - a.latestAt);
  return groups;
}

export function liveChatStatusLabel(status?: string): string {
  if (status === "REJECTED") return "Closed";
  if (status === "PENDING") return "Pending";
  if (status === "ACTIVE") return "Active";
  if (status === "CLOSED") return "Closed";
  return status || "—";
}

export function liveChatStatusSortRank(status?: string): number {
  return STATUS_ORDER[status || ""] ?? 9;
}
