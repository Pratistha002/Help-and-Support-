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
  { bg: "#eef2ff", border: "#a5b4fc", accent: "#4f46e5", avatar: "#6366f1" },
  { bg: "#ecfdf5", border: "#6ee7b7", accent: "#059669", avatar: "#10b981" },
  { bg: "#fff7ed", border: "#fdba74", accent: "#ea580c", avatar: "#f97316" },
  { bg: "#fdf2f8", border: "#f9a8d4", accent: "#db2777", avatar: "#ec4899" },
  { bg: "#f0fdfa", border: "#5eead4", accent: "#0f766e", avatar: "#14b8a6" },
  { bg: "#fefce8", border: "#fde047", accent: "#ca8a04", avatar: "#eab308" },
  { bg: "#f5f3ff", border: "#c4b5fd", accent: "#7c3aed", avatar: "#8b5cf6" },
  { bg: "#eff6ff", border: "#93c5fd", accent: "#2563eb", avatar: "#3b82f6" },
  { bg: "#fff1f2", border: "#fda4af", accent: "#e11d48", avatar: "#f43f5e" },
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
