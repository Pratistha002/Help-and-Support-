import type { TicketDoc } from "./store";

/** Ticket field normalization for workforce support store (Spring-compatible field names). */
export function buildUriForDatabase(uri: string, database: string): string {
  const trimmed = uri.trim();
  const qIndex = trimmed.indexOf("?");
  const pathPart = qIndex >= 0 ? trimmed.slice(0, qIndex) : trimmed;
  const query = qIndex >= 0 ? trimmed.slice(qIndex) : "";

  const lastSlash = pathPart.lastIndexOf("/");
  if (lastSlash > pathPart.indexOf("//") + 1) {
    return pathPart.slice(0, lastSlash + 1) + database + query;
  }
  return `${pathPart.replace(/\/$/, "")}/${database}${query}`;
}

export function normalizeTicketDoc(raw: Record<string, unknown>): TicketDoc {
  const id = raw._id ?? raw.id;
  const channel = String(raw.sourceChannel ?? raw.channel ?? "TICKET_FORM");
  return {
    _id: id as TicketDoc["_id"],
    id: String(id),
    ticketNumber: String(raw.ticketNumber ?? ""),
    email: String(raw.userEmail ?? raw.email ?? "").trim().toLowerCase(),
    name: raw.userName != null ? String(raw.userName) : raw.name != null ? String(raw.name) : undefined,
    subject: String(raw.subject ?? ""),
    description: String(raw.description ?? ""),
    category: String(raw.category ?? "General"),
    consumerType: String(raw.consumerType ?? "EMPLOYEE"),
    userId: raw.userId != null ? String(raw.userId) : undefined,
    channel,
    sourceChannel: channel,
    status: String(raw.status ?? "OPEN"),
    phone: raw.userPhone != null ? String(raw.userPhone) : raw.phone != null ? String(raw.phone) : undefined,
    liveChatSessionId: raw.liveChatSessionId != null ? String(raw.liveChatSessionId) : undefined,
    callbackRequestId: raw.callbackRequestId != null ? String(raw.callbackRequestId) : undefined,
    assignedAdminId: raw.assignedAdminId != null ? String(raw.assignedAdminId) : raw.assignedAgentId != null ? String(raw.assignedAgentId) : undefined,
    assignedAdminName: raw.assignedAdminName != null ? String(raw.assignedAdminName) : raw.assignedAgentName != null ? String(raw.assignedAgentName) : undefined,
    assignedAdminEmail: raw.assignedAdminEmail != null ? String(raw.assignedAdminEmail).toLowerCase() : raw.assignedAgentEmail != null ? String(raw.assignedAgentEmail).toLowerCase() : undefined,
    assignedAgentId: raw.assignedAgentId != null ? String(raw.assignedAgentId) : undefined,
    assignedAgentName: raw.assignedAgentName != null ? String(raw.assignedAgentName) : undefined,
    assignedAgentEmail: raw.assignedAgentEmail != null ? String(raw.assignedAgentEmail).toLowerCase() : undefined,
    priority: raw.priority != null ? String(raw.priority) : undefined,
    assignedTechnicalMemberId: raw.assignedTechnicalMemberId != null ? String(raw.assignedTechnicalMemberId) : undefined,
    assignedTechnicalMemberName: raw.assignedTechnicalMemberName != null ? String(raw.assignedTechnicalMemberName) : undefined,
    assignedTechnicalMemberEmail: raw.assignedTechnicalMemberEmail != null ? String(raw.assignedTechnicalMemberEmail).toLowerCase() : undefined,
    assignedTechnicalMemberPhone: raw.assignedTechnicalMemberPhone != null ? String(raw.assignedTechnicalMemberPhone) : undefined,
    assignedTechnicalMemberDesignation: raw.assignedTechnicalMemberDesignation != null ? String(raw.assignedTechnicalMemberDesignation) : undefined,
    escalationNote: raw.escalationNote != null ? String(raw.escalationNote) : undefined,
    escalatedAt: raw.escalatedAt as Date | undefined,
    escalatedByAdminId: raw.escalatedByAdminId != null ? String(raw.escalatedByAdminId) : undefined,
    escalatedByAdminName: raw.escalatedByAdminName != null ? String(raw.escalatedByAdminName) : undefined,
    escalatedByAdminEmail: raw.escalatedByAdminEmail != null ? String(raw.escalatedByAdminEmail).toLowerCase() : undefined,
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : undefined,
    createdAt: raw.createdAt as Date | undefined,
    updatedAt: raw.updatedAt as Date | undefined,
  };
}

export function normalizeMessageDoc(raw: Record<string, unknown>) {
  const role = String(raw.senderRole ?? raw.senderType ?? "USER").toUpperCase();
  const senderType =
    role === "USER" ? "USER"
    : role === "AGENT" || role === "ADMIN" ? "ADMIN"
    : role;
  return {
    ...raw,
    senderType,
    senderName: raw.senderName != null ? String(raw.senderName) : undefined,
    content: String(raw.content ?? ""),
  };
}

export function guestUserId(email: string): string {
  return `guest-${email.trim().toLowerCase().replace(/[^a-z0-9]/g, "")}`;
}
