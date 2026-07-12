import mongoose, { Schema, type Model } from "mongoose";
import { normalizeEmailKey, normalizePhoneKey } from "../customerGroup";
import { connectDb } from "./db";
import {
  guestUserId,
  normalizeMessageDoc,
  normalizeTicketDoc,
} from "./ticketCompat";
import { readEnv } from "./env";

export type TicketDoc = {
  _id: mongoose.Types.ObjectId;
  id?: string;
  ticketNumber: string;
  email: string;
  userEmail?: string;
  name?: string;
  userName?: string;
  subject: string;
  description: string;
  category: string;
  consumerType: string;
  userId?: string;
  channel: string;
  sourceChannel?: string;
  status: string;
  phone?: string;
  userPhone?: string;
  liveChatSessionId?: string;
  callbackRequestId?: string;
  assignedAdminId?: string;
  assignedAdminName?: string;
  assignedAdminEmail?: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  assignedAgentEmail?: string;
  priority?: string;
  assignedTechnicalMemberId?: string;
  assignedTechnicalMemberName?: string;
  assignedTechnicalMemberEmail?: string;
  assignedTechnicalMemberPhone?: string;
  assignedTechnicalMemberDesignation?: string;
  escalationNote?: string;
  escalatedAt?: Date;
  escalatedByAdminId?: string;
  escalatedByAdminName?: string;
  escalatedByAdminEmail?: string;
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
};

export const LIVE_CHAT_RAISE_TICKET_TAG = "admin-live-chat-token";
export const ADMIN_AGENT_RAISED_TAG = "admin-agent-raised";

const ticketSchema = new Schema(
  {
    ticketNumber: { type: String, required: true, unique: true },
    email: { type: String, lowercase: true, trim: true },
    userEmail: { type: String, lowercase: true, trim: true },
    name: String,
    userName: String,
    subject: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, default: "General" },
    consumerType: { type: String, default: "EMPLOYEE" },
    userId: String,
    channel: { type: String, default: "TICKET_FORM" },
    sourceChannel: { type: String, default: "TICKET_FORM" },
    status: { type: String, default: "OPEN" },
    phone: String,
    userPhone: String,
    liveChatSessionId: String,
    callbackRequestId: String,
    assignedAdmin: String,
    assignedAdminId: String,
    assignedAdminName: String,
    assignedAdminEmail: { type: String, lowercase: true, trim: true },
    assignedAgentId: String,
    assignedAgentName: String,
    assignedAgentEmail: { type: String, lowercase: true, trim: true },
    assignedTechnicalMemberId: String,
    assignedTechnicalMemberName: String,
    assignedTechnicalMemberEmail: { type: String, lowercase: true, trim: true },
    assignedTechnicalMemberPhone: String,
    assignedTechnicalMemberDesignation: String,
    escalationNote: String,
    escalatedAt: Date,
    escalatedByAdminId: String,
    escalatedByAdminName: String,
    escalatedByAdminEmail: { type: String, lowercase: true, trim: true },
    priority: { type: String, default: "NORMAL" },
    humanHandled: { type: Boolean, default: true },
    aiHandled: { type: Boolean, default: false },
    tags: { type: [String], default: [] },
  },
  { timestamps: true, collection: "workforce_support_tickets" },
);

const ticketMsgSchema = new Schema(
  {
    ticketId: { type: String, required: true },
    senderType: { type: String, default: "USER" },
    senderRole: String,
    senderId: String,
    senderName: String,
    content: { type: String, required: true },
    channel: String,
    fromAi: { type: Boolean, default: false },
    internalNote: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "workforce_support_ticket_messages" },
);

const LIVE_CHAT_SESSIONS_COLLECTION = "workforce_live_chat_sessions";
const LIVE_CHAT_MESSAGES_COLLECTION = "workforce_live_chat_messages";

const liveSessionSchema = new Schema(
  {
    userId: { type: String, required: true },
    userName: String,
    userEmail: String,
    userPhone: String,
    consumerType: { type: String, default: "EMPLOYEE" },
    serviceLabel: String,
    initialMessage: String,
    status: { type: String, default: "PENDING" },
    ticketId: String,
    assignedAdminId: String,
    assignedAdminName: String,
    assignedAdminEmail: String,
    unreadForAdmin: { type: Number, default: 0 },
    unreadForUser: { type: Number, default: 0 },
    acceptedAt: Date,
    closedAt: Date,
    lastMessageAt: Date,
  },
  { timestamps: true, collection: LIVE_CHAT_SESSIONS_COLLECTION },
);

const liveMsgSchema = new Schema(
  {
    sessionId: { type: String, required: true },
    senderRole: { type: String, required: true },
    senderType: String,
    senderId: String,
    senderName: String,
    content: { type: String, required: true },
  },
  { timestamps: true, collection: LIVE_CHAT_MESSAGES_COLLECTION },
);

const supportAgentSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    username: { type: String, trim: true },
    notifyOnNewTickets: { type: Boolean, default: true },
    online: { type: Boolean, default: false },
    lastLoginAt: Date,
  },
  { timestamps: true, collection: "workforce_support_agents" },
);

const callbackSchema = new Schema(
  {
    status: { type: String, default: "PENDING" },
    phone: { type: String, required: true },
    callerName: { type: String, required: true },
    callerEmail: String,
    consumerType: { type: String, default: "EMPLOYEE" },
    ticketId: String,
    ticketNumber: String,
    queuePosition: Number,
    twilioCallSid: String,
    lastCallAttemptAt: Date,
    adminPhone: String,
    callNotes: String,
  },
  { timestamps: true, collection: "workforce_callback_requests" },
);

const technicalTeamSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: String,
    designation: String,
    department: { type: String, default: "Technical Support" },
    specialty: String,
    active: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "workforce_technical_team_members" },
);

function getModels() {
  if (mongoose.models.LiveChatSession) delete mongoose.models.LiveChatSession;
  if (mongoose.models.LiveChatMessage) delete mongoose.models.LiveChatMessage;
  const Ticket = (mongoose.models.SupportTicket as Model<TicketDoc>) || mongoose.model<TicketDoc>("SupportTicket", ticketSchema);
  const TicketMsg = mongoose.models.SupportTicketMessage || mongoose.model("SupportTicketMessage", ticketMsgSchema);
  const LiveSession = mongoose.models.LiveChatSession || mongoose.model("LiveChatSession", liveSessionSchema);
  const LiveMsg = mongoose.models.LiveChatMessage || mongoose.model("LiveChatMessage", liveMsgSchema);
  const CallbackRequest = mongoose.models.SupportCallbackRequest || mongoose.model("SupportCallbackRequest", callbackSchema);
  const SupportAgent = (mongoose.models.SupportAgent as Model<SupportAgentDoc>)
    || mongoose.model<SupportAgentDoc>("SupportAgent", supportAgentSchema);
  const TechnicalTeamMember = mongoose.models.TechnicalTeamMember
    || mongoose.model("TechnicalTeamMember", technicalTeamSchema);
  return { Ticket, TicketMsg, LiveSession, LiveMsg, CallbackRequest, SupportAgent, TechnicalTeamMember };
}

export type SupportAgentDoc = {
  _id: mongoose.Types.ObjectId;
  id?: string;
  email: string;
  name: string;
  username?: string;
  notifyOnNewTickets?: boolean;
  online?: boolean;
  lastLoginAt?: Date;
};

export async function upsertSupportAgent(payload: { email: string; name: string; username?: string }) {
  await connectDb();
  const { SupportAgent } = getModels();
  const email = payload.email.trim().toLowerCase();
  const name = payload.name.trim() || email.split("@")[0];
  const agent = await SupportAgent.findOneAndUpdate(
    { email },
    {
      $set: {
        name,
        username: payload.username?.trim() || name,
        lastLoginAt: new Date(),
        notifyOnNewTickets: true,
      },
      $setOnInsert: { email },
    },
    { upsert: true, new: true },
  ).lean<SupportAgentDoc>();
  if (!agent) {
    throw new Error("Failed to register support agent");
  }
  return {
    id: String(agent._id),
    email: String(agent.email),
    name: String(agent.name),
    username: agent.username ? String(agent.username) : name,
  };
}

export async function listSupportAgentsForNotify() {
  await connectDb();
  const { SupportAgent } = getModels();
  const rows = await SupportAgent.find({ notifyOnNewTickets: { $ne: false } }).lean<SupportAgentDoc[]>();
  return rows.map((a) => ({
    id: String(a._id),
    email: String(a.email),
    name: String(a.name || a.email),
  }));
}

export function isTicketAssignedToAgent(
  ticket: TicketDoc | null | undefined,
  agentId?: string,
  agentEmail?: string,
) {
  if (!ticket) return false;
  const email = agentEmail?.trim().toLowerCase();
  if (ticket.assignedAdminId && agentId && ticket.assignedAdminId === agentId) return true;
  if (ticket.assignedAdminEmail && email && ticket.assignedAdminEmail === email) return true;
  return false;
}

export function ticketHasAssignee(ticket: TicketDoc | null | undefined) {
  return Boolean(
    ticket?.assignedAdminId
    || ticket?.assignedAdminEmail
    || ticket?.assignedAgentId
    || ticket?.assignedAgentEmail,
  );
}

export async function assignTicketToAgent(
  ticketId: string,
  agent: { id: string; name: string; email: string },
) {
  await connectDb();
  const { Ticket, TicketMsg } = getModels();
  const existing = await Ticket.findById(ticketId).lean();
  if (!existing) return null;

  const assignedId = existing.assignedAdminId || existing.assignedAgentId;
  const assignedEmail = String(existing.assignedAdminEmail || existing.assignedAgentEmail || "").toLowerCase();
  if (assignedId && assignedId !== agent.id) {
    throw new Error("Ticket is already assigned to another agent");
  }
  if (assignedEmail && assignedEmail !== agent.email.toLowerCase()) {
    throw new Error("Ticket is already assigned to another agent");
  }

  const nextStatus = ["OPEN", "PENDING"].includes(String(existing.status)) ? "IN_PROGRESS" : existing.status;
  const ticket = await Ticket.findByIdAndUpdate(
    ticketId,
    {
      assignedAdminId: agent.id,
      assignedAdminName: agent.name,
      assignedAdminEmail: agent.email.toLowerCase(),
      assignedAdmin: agent.email.toLowerCase(),
      assignedAgentId: agent.id,
      assignedAgentName: agent.name,
      assignedAgentEmail: agent.email.toLowerCase(),
      status: nextStatus,
    },
    { new: true },
  ).lean();

  if (ticket) {
    await TicketMsg.create({
      ticketId,
      senderType: "ADMIN",
      senderRole: "AGENT",
      senderName: agent.name,
      content: `Ticket accepted by ${agent.name} (${agent.email})`,
      fromAi: false,
      internalNote: true,
    });
  }

  return ticket ? normalizeTicketDoc(ticket as Record<string, unknown>) : null;
}

async function nextTicketNumber() {
  const { Ticket } = getModels();
  const useSaarthixDb = Boolean(readEnv().supportMongodbDatabase?.trim());

  if (useSaarthixDb) {
    const latest = await Ticket.find({ ticketNumber: /^SX-\d+$/ })
      .sort({ ticketNumber: -1 })
      .limit(1)
      .lean();
    if (latest.length) {
      const n = parseInt(String(latest[0].ticketNumber).slice(3), 10);
      if (Number.isFinite(n)) return `SX-${n + 1}`;
    }
    return "SX-1001";
  }

  const n = await Ticket.countDocuments();
  return `HS-${String(n + 1001).padStart(6, "0")}`;
}

export async function createTicket(payload: {
  email: string;
  name?: string;
  subject: string;
  description: string;
  category?: string;
  consumerType?: string;
  userId?: string;
  channel?: string;
  liveChatSessionId?: string;
  callbackRequestId?: string;
  status?: string;
  phone?: string;
  tags?: string[];
}) {
  await connectDb();
  const { Ticket, TicketMsg } = getModels();
  const ticketNumber = await nextTicketNumber();
  const email = payload.email.trim().toLowerCase();
  const channel = payload.channel || "TICKET_FORM";
  const userId = payload.userId || guestUserId(email);
  const ticket = await Ticket.create({
    ticketNumber,
    email,
    userEmail: email,
    name: payload.name,
    userName: payload.name,
    subject: payload.subject,
    description: payload.description,
    category: payload.category || "General",
    consumerType: payload.consumerType || "EMPLOYEE",
    userId,
    channel,
    sourceChannel: channel,
    status: payload.status || "OPEN",
    liveChatSessionId: payload.liveChatSessionId,
    callbackRequestId: payload.callbackRequestId,
    phone: payload.phone,
    userPhone: payload.phone,
    humanHandled: true,
    aiHandled: false,
    priority: "MEDIUM",
    tags: payload.tags?.length ? payload.tags : [],
  });
  await TicketMsg.create({
    ticketId: String(ticket._id),
    senderType: "USER",
    senderRole: "USER",
    senderId: userId,
    senderName: payload.name || email,
    content: payload.description,
    channel,
    fromAi: false,
    internalNote: false,
  });
  return normalizeTicketDoc(ticket.toObject() as Record<string, unknown>);
}

export async function updateTicketStatus(
  ticketId: string,
  status: string,
  adminName?: string,
  agent?: { id?: string; email?: string },
  skipAssignmentCheck = false,
) {
  await connectDb();
  const { Ticket, TicketMsg } = getModels();
  const current = await Ticket.findById(ticketId).lean();
  if (!current) return null;

  const normalized = normalizeTicketDoc(current as Record<string, unknown>);
  if (!skipAssignmentCheck) {
    if (ticketHasAssignee(normalized)) {
      if (!isTicketAssignedToAgent(normalized, agent?.id, agent?.email)) {
        throw new Error("Only the assigned agent can update this ticket's status");
      }
    } else {
      throw new Error("Accept the ticket before updating its status");
    }
  }

  const ticket = await Ticket.findByIdAndUpdate(
    ticketId,
    status === "ESCALATED" ? { status, escalatedAt: new Date() } : { status },
    { new: true },
  ).lean();
  if (ticket && adminName) {
    await TicketMsg.create({
      ticketId,
      senderType: "ADMIN",
      senderRole: "AGENT",
      senderName: adminName,
      content: `Status changed to ${status}`,
      fromAi: false,
      internalNote: false,
    });
  }
  return ticket ? normalizeTicketDoc(ticket as Record<string, unknown>) : null;
}

export async function listAllTickets(channel?: string, status?: string) {
  await connectDb();
  const { Ticket } = getModels();
  const q: Record<string, unknown> = {};
  if (channel) {
    q.$or = [{ channel }, { sourceChannel: channel }];
  }
  if (status) {
    q.status = status;
  }
  const rows = await Ticket.find(q).sort({ createdAt: -1 }).limit(200).lean();
  return rows.map((t) => normalizeTicketDoc(t as Record<string, unknown>));
}

export type TechnicalTeamMemberDoc = {
  _id: mongoose.Types.ObjectId;
  id?: string;
  name: string;
  email: string;
  phone?: string;
  designation?: string;
  department?: string;
  specialty?: string;
  active?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

function normalizeTechnicalMember(raw: Record<string, unknown>): TechnicalTeamMemberDoc & { id: string } {
  const id = String(raw._id ?? raw.id);
  return {
    ...(raw as TechnicalTeamMemberDoc),
    id,
    _id: raw._id as mongoose.Types.ObjectId,
    name: String(raw.name ?? ""),
    email: String(raw.email ?? "").toLowerCase(),
    phone: raw.phone != null ? String(raw.phone) : undefined,
    designation: raw.designation != null ? String(raw.designation) : undefined,
    department: raw.department != null ? String(raw.department) : undefined,
    specialty: raw.specialty != null ? String(raw.specialty) : undefined,
    active: raw.active !== false,
  };
}

export async function listTechnicalTeam(activeOnly = true) {
  await connectDb();
  const { TechnicalTeamMember } = getModels();
  const q = activeOnly ? { active: true } : {};
  const rows = await TechnicalTeamMember.find(q).sort({ name: 1 }).lean();
  return rows.map((m) => normalizeTechnicalMember(m as Record<string, unknown>));
}

export async function getTechnicalMemberById(id: string) {
  await connectDb();
  const { TechnicalTeamMember } = getModels();
  const row = await TechnicalTeamMember.findById(id).lean();
  return row ? normalizeTechnicalMember(row as Record<string, unknown>) : null;
}

export async function createTechnicalMember(payload: {
  name: string;
  email: string;
  phone?: string;
  designation?: string;
  department?: string;
  specialty?: string;
}) {
  await connectDb();
  const { TechnicalTeamMember } = getModels();
  const email = payload.email.trim().toLowerCase();
  const existing = await TechnicalTeamMember.findOne({ email }).lean();
  if (existing) throw new Error("A team member with this email already exists");
  const doc = await TechnicalTeamMember.create({
    name: payload.name.trim(),
    email,
    phone: payload.phone?.trim() || undefined,
    designation: payload.designation?.trim() || undefined,
    department: payload.department?.trim() || "Technical Support",
    specialty: payload.specialty?.trim() || undefined,
    active: true,
  });
  return normalizeTechnicalMember(doc.toObject() as Record<string, unknown>);
}

export async function updateTechnicalMember(
  id: string,
  payload: Partial<{ name: string; email: string; phone: string; designation: string; department: string; specialty: string; active: boolean }>,
) {
  await connectDb();
  const { TechnicalTeamMember } = getModels();
  const update: Record<string, unknown> = {};
  if (payload.name != null) update.name = payload.name.trim();
  if (payload.email != null) update.email = payload.email.trim().toLowerCase();
  if (payload.phone != null) update.phone = payload.phone.trim() || undefined;
  if (payload.designation != null) update.designation = payload.designation.trim() || undefined;
  if (payload.department != null) update.department = payload.department.trim() || undefined;
  if (payload.specialty != null) update.specialty = payload.specialty.trim() || undefined;
  if (payload.active != null) update.active = payload.active;
  const doc = await TechnicalTeamMember.findByIdAndUpdate(id, update, { new: true }).lean();
  if (!doc) return null;
  return normalizeTechnicalMember(doc as Record<string, unknown>);
}

export async function deactivateTechnicalMember(id: string) {
  return updateTechnicalMember(id, { active: false });
}

export async function assignTechnicalEscalation(
  ticketId: string,
  technicalMemberId: string,
  note: string | undefined,
  admin: { id: string; name: string; email: string },
) {
  await connectDb();
  const { Ticket, TicketMsg } = getModels();
  const member = await getTechnicalMemberById(technicalMemberId);
  if (!member || member.active === false) throw new Error("Technical team member not found or inactive");

  const now = new Date();
  const adminName = admin.name?.trim() || "Support Admin";
  const adminEmail = admin.email?.trim().toLowerCase() || "";

  const ticket = await Ticket.findByIdAndUpdate(
    ticketId,
    {
      status: "ESCALATED",
      assignedTechnicalMemberId: member.id,
      assignedTechnicalMemberName: member.name,
      assignedTechnicalMemberEmail: member.email,
      assignedTechnicalMemberPhone: member.phone,
      assignedTechnicalMemberDesignation: member.designation || member.specialty || "Specialist",
      escalatedAt: now,
      escalatedByAdminId: admin.id,
      escalatedByAdminName: adminName,
      escalatedByAdminEmail: adminEmail,
      ...(note?.trim() ? { escalationNote: note.trim() } : {}),
    },
    { new: true },
  ).lean();

  if (!ticket) throw new Error("Ticket not found");
  const normalized = normalizeTicketDoc(ticket as Record<string, unknown>);

  const internalMsg = [
    `Escalated to technical team — assigned to ${member.name}`,
    member.email ? `(${member.email})` : "",
    member.phone ? `, ${member.phone}` : "",
    `\nEscalated by: ${adminName}`,
    adminEmail ? ` (${adminEmail})` : "",
    note?.trim() ? `\nNote: ${note.trim()}` : "",
  ].join("");

  await TicketMsg.create({
    ticketId,
    senderType: "ADMIN",
    senderRole: "AGENT",
    senderName: adminName,
    content: internalMsg,
    fromAi: false,
    internalNote: true,
  });

  return { ticket: normalized, member };
}

export async function listAgentRaisedTickets() {
  await connectDb();
  const { Ticket } = getModels();
  const rows = await Ticket.find({
    $or: [
      { channel: "ADMIN_RAISED" },
      { sourceChannel: "ADMIN_RAISED" },
      { tags: LIVE_CHAT_RAISE_TICKET_TAG },
      { tags: ADMIN_AGENT_RAISED_TAG },
      { liveChatSessionId: { $exists: true, $nin: [null, ""] } },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  return rows.map((t) => normalizeTicketDoc(t as Record<string, unknown>));
}

export async function getTicketById(id: string) {
  await connectDb();
  const { Ticket } = getModels();
  const ticket = await Ticket.findById(id).lean();
  return ticket ? normalizeTicketDoc(ticket as Record<string, unknown>) : null;
}

export async function getTicketMessages(ticketId: string) {
  await connectDb();
  const { TicketMsg } = getModels();
  const msgs = await TicketMsg.find({ ticketId }).sort({ createdAt: 1 }).lean();
  return msgs.map((m) => normalizeMessageDoc(m as Record<string, unknown>));
}

export async function addTicketMessage(ticketId: string, senderType: string, content: string, senderName?: string) {
  await connectDb();
  const { TicketMsg } = getModels();
  const role = senderType === "ADMIN" ? "AGENT" : senderType;
  return TicketMsg.create({
    ticketId,
    senderType,
    senderRole: role,
    senderName,
    content,
    fromAi: false,
    internalNote: false,
  });
}

export async function getTicketStatusCounts() {
  await connectDb();
  const { Ticket } = getModels();
  const statuses = ["OPEN", "IN_PROGRESS", "PENDING", "PENDING_WITH_USER", "ESCALATED", "RESOLVED", "CLOSED"];
  const counts: Record<string, number> = {};
  for (const s of statuses) {
    counts[s] = await Ticket.countDocuments({ status: s });
  }
  counts.TOTAL = await Ticket.countDocuments();
  return counts;
}

export async function listTicketsForUser(userId: string, email?: string) {
  await connectDb();
  const { Ticket } = getModels();
  const or: Record<string, unknown>[] = [{ userId }];
  const key = email?.trim().toLowerCase();
  if (key) {
    or.push({ email: key }, { userEmail: key });
  }
  const rows = await Ticket.find({ $or: or }).sort({ createdAt: -1 }).lean();
  const seen = new Set<string>();
  const unique = rows.filter((t) => {
    const id = String(t._id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  return unique.map((t) => normalizeTicketDoc(t as Record<string, unknown>));
}

export async function lookupTicketsByEmail(email: string) {
  await connectDb();
  const { Ticket } = getModels();
  const key = email.trim().toLowerCase();
  const rows = await Ticket.find({
    $or: [{ email: key }, { userEmail: key }],
  }).sort({ createdAt: -1 }).lean();
  return rows.map((t) => normalizeTicketDoc(t as Record<string, unknown>));
}

function customerOwnsTicket(
  ticket: { userId?: string | null; email?: string | null; userEmail?: string | null },
  userId: string,
  userEmail: string,
) {
  const emailKey = userEmail.trim().toLowerCase();
  if (ticket.userId && ticket.userId === userId) return true;
  const ticketEmail = String(ticket.userEmail ?? ticket.email ?? "").trim().toLowerCase();
  return Boolean(emailKey && ticketEmail && ticketEmail === emailKey);
}

export async function closeTicketByUser(
  ticketId: string,
  userId: string,
  userEmail: string,
  senderName?: string,
  reason?: string,
) {
  await connectDb();
  const { Ticket, TicketMsg } = getModels();
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) throw new Error("Ticket not found");
  if (!customerOwnsTicket(ticket, userId, userEmail)) {
    throw new Error("You do not have access to this ticket");
  }
  if (ticket.status === "CLOSED") throw new Error("This ticket is already closed");

  ticket.status = "CLOSED";
  await ticket.save();

  const note = reason?.trim();
  const content = note ? `Customer closed this ticket: ${note}` : "Customer closed this ticket.";
  const channel = ticket.sourceChannel || ticket.channel || "TICKET_FORM";
  await TicketMsg.create({
    ticketId: String(ticket._id),
    senderType: "USER",
    senderRole: "USER",
    senderId: userId,
    senderName: senderName || ticket.userName || ticket.name || userEmail,
    content,
    channel,
    fromAi: false,
    internalNote: false,
  });

  return normalizeTicketDoc(ticket.toObject() as Record<string, unknown>);
}

export async function closeTicketByGuest(ticketId: string, email: string, reason?: string) {
  await connectDb();
  const { Ticket, TicketMsg } = getModels();
  const key = email.trim().toLowerCase();
  if (!key) throw new Error("Email is required");

  const ticket = await Ticket.findById(ticketId);
  if (!ticket) throw new Error("Ticket not found");
  const ticketEmail = String(ticket.userEmail ?? ticket.email ?? "").trim().toLowerCase();
  if (!ticketEmail || ticketEmail !== key) {
    throw new Error("Email does not match this ticket");
  }
  if (ticket.status === "CLOSED") throw new Error("This ticket is already closed");

  ticket.status = "CLOSED";
  await ticket.save();

  const note = reason?.trim();
  const content = note ? `Customer closed this ticket: ${note}` : "Customer closed this ticket.";
  const channel = ticket.sourceChannel || ticket.channel || "TICKET_FORM";
  const senderId = ticket.userId || guestUserId(key);
  await TicketMsg.create({
    ticketId: String(ticket._id),
    senderType: "USER",
    senderRole: "USER",
    senderId,
    senderName: ticket.userName || ticket.name || "Customer",
    content,
    channel,
    fromAi: false,
    internalNote: false,
  });

  return normalizeTicketDoc(ticket.toObject() as Record<string, unknown>);
}

function contactMatchQuery(opts: { phone?: string; email?: string }) {
  const or: Record<string, unknown>[] = [];
  const email = normalizeEmailKey(opts.email);
  if (email) {
    or.push({ email });
    or.push({ userEmail: email });
  }

  const phoneKey = normalizePhoneKey(opts.phone);
  if (phoneKey) {
    or.push({ phone: { $regex: `${phoneKey}$` } });
    or.push({ phone: { $regex: phoneKey } });
  }

  return or.length ? { $or: or } : null;
}

export async function listTicketsByContact(opts: { phone?: string; email?: string }, limit = 50) {
  await connectDb();
  const { Ticket } = getModels();
  const query = contactMatchQuery(opts);
  if (!query) return [];
  const rows = await Ticket.find(query).sort({ createdAt: -1 }).limit(limit).lean();
  return rows.map((t) => normalizeTicketDoc(t as Record<string, unknown>));
}

export async function listCallbacksByContact(opts: { phone?: string; email?: string }, limit = 50) {
  await connectDb();
  const { CallbackRequest } = getModels();
  const or: Record<string, unknown>[] = [];
  const email = normalizeEmailKey(opts.email);
  if (email) or.push({ callerEmail: email });

  const phoneKey = normalizePhoneKey(opts.phone);
  if (phoneKey) {
    or.push({ phone: { $regex: `${phoneKey}$` } });
    or.push({ phone: { $regex: phoneKey } });
  }

  if (!or.length) return [];
  return CallbackRequest.find({ $or: or }).sort({ createdAt: -1 }).limit(limit).lean();
}

export async function getCustomerHistory(opts: { phone?: string; email?: string }) {
  const [tickets, callbacks] = await Promise.all([
    listTicketsByContact(opts),
    listCallbacksByContact(opts),
  ]);
  return { tickets, callbacks };
}

const PENDING_TIMEOUT_MS = 300_000;
const pendingTimers = new Map<string, NodeJS.Timeout>();

function normalizeSenderRole(senderType: string): string {
  if (senderType === "ADMIN") return "AGENT";
  return senderType;
}

async function findLiveSessionDoc(sessionId: string) {
  const { LiveSession } = getModels();
  return LiveSession.findById(sessionId);
}

function serializeSession(s: any) {
  return {
    id: String(s._id),
    status: s.status,
    userId: s.userId,
    userName: s.userName,
    userEmail: s.userEmail,
    consumerType: s.consumerType,
    serviceLabel: s.serviceLabel,
    initialMessage: s.initialMessage,
    assignedAdminId: s.assignedAdminId,
    assignedAdminName: s.assignedAdminName,
    assignedAdminEmail: s.assignedAdminEmail,
    unreadForAdmin: s.unreadForAdmin,
    unreadForUser: s.unreadForUser,
    acceptedAt: s.acceptedAt,
    closedAt: s.closedAt,
    lastMessageAt: s.lastMessageAt,
    createdAt: s.createdAt,
  };
}

async function saveLiveMessage(
  sessionId: string,
  senderType: string,
  content: string,
  senderId?: string,
  senderName?: string,
) {
  await connectDb();
  const { LiveSession, LiveMsg } = getModels();
  const senderRole = normalizeSenderRole(senderType);
  const msg = await LiveMsg.create({
    sessionId,
    senderRole,
    senderType,
    content,
    senderId,
    senderName,
  });
  await LiveSession.updateOne(
    { _id: sessionId },
    {
      lastMessageAt: new Date(),
      ...(senderRole === "USER" ? { $inc: { unreadForAdmin: 1 } } : { $inc: { unreadForUser: 1 } }),
    },
  );
  return {
    id: String(msg._id),
    sessionId,
    senderRole,
    senderType,
    senderId,
    senderName,
    content,
    createdAt: (msg as any).createdAt,
  };
}

export async function rejectPendingSession(sessionId: string, reason: string) {
  await connectDb();
  const session = await findLiveSessionDoc(sessionId);
  if (!session || session.status !== "PENDING") return null;
  const t = pendingTimers.get(sessionId);
  if (t) clearTimeout(t);
  pendingTimers.delete(sessionId);
  session.status = "REJECTED";
  session.closedAt = new Date();
  await session.save();
  return serializeSession(session);
}

function schedulePendingTimeout(sessionId: string) {
  const existing = pendingTimers.get(sessionId);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    void rejectPendingSession(sessionId, "No live agent is available. Please try again later.");
  }, PENDING_TIMEOUT_MS);
  pendingTimers.set(sessionId, timer);
}

export async function requestLiveChat(
  user: { id: string; fullName?: string; email?: string; currentRole?: string; accountType?: string },
  body: { initialMessage?: string; consumerType?: string; serviceLabel?: string },
) {
  await connectDb();
  const { LiveSession } = getModels();
  const existing = await LiveSession.findOne({ userId: user.id, status: { $in: ["PENDING", "ACTIVE"] } });
  if (existing) return serializeSession(existing);

  const initial = String(body?.initialMessage || "").trim();
  const consumerType = body?.consumerType || (user.accountType === "ADMIN" ? "ADMIN" : user.currentRole || "EMPLOYEE");

  const session = await LiveSession.create({
    userId: user.id,
    userName: user.fullName || user.email,
    userEmail: user.email,
    consumerType,
    serviceLabel: body?.serviceLabel,
    initialMessage: initial,
    status: "PENDING",
    unreadForAdmin: 1,
    lastMessageAt: new Date(),
  });

  const sessionId = String(session._id);
  if (initial) {
    await saveLiveMessage(sessionId, "USER", initial, user.id, user.fullName);
  }
  await saveLiveMessage(
    sessionId,
    "SYSTEM",
    "Your request was sent. A support agent will join shortly — please keep this page open.",
  );

  schedulePendingTimeout(sessionId);

  try {
    const { notifyAdminLiveChatRequest } = await import("./adminNotifications");
    await notifyAdminLiveChatRequest({
      _id: session._id,
      userName: session.userName,
      consumerType: session.consumerType,
      initialMessage: session.initialMessage,
      serviceLabel: session.serviceLabel,
    });
  } catch {
    /* non-blocking */
  }

  return serializeSession(session);
}

export async function getUserActiveSession(userId: string) {
  await connectDb();
  const { LiveSession } = getModels();
  const s = await LiveSession.findOne({ userId, status: { $in: ["PENDING", "ACTIVE"] } }).sort({ createdAt: -1 });
  return s ? serializeSession(s) : null;
}

export async function getLiveSession(sessionId: string) {
  await connectDb();
  const s = await findLiveSessionDoc(sessionId);
  return s ? serializeSession(s) : null;
}

export async function listLiveMessages(sessionId: string) {
  await connectDb();
  await findLiveSessionDoc(sessionId);
  const { LiveMsg } = getModels();
  const msgs = await LiveMsg.find({ sessionId }).sort({ createdAt: 1 }).lean();
  return msgs.map((m: any) => ({
    id: String(m._id),
    sessionId: m.sessionId,
    senderRole: m.senderRole || normalizeSenderRole(String(m.senderType || "USER")),
    senderType: m.senderType || (m.senderRole === "AGENT" ? "ADMIN" : m.senderRole),
    senderId: m.senderId,
    senderName: m.senderName,
    content: m.content,
    createdAt: m.createdAt,
  }));
}

export async function sendLiveMessage(
  sessionId: string,
  senderType: string,
  content: string,
  senderId?: string,
  senderName?: string,
) {
  await connectDb();
  const session = await findLiveSessionDoc(sessionId);
  if (!session) throw new Error("Session not found");
  if (senderType === "USER" && session.status !== "ACTIVE") {
    throw new Error("Waiting for an agent to accept your chat");
  }
  return saveLiveMessage(sessionId, senderType, content, senderId, senderName);
}

export async function acceptLiveSession(sessionId: string, admin: { id: string; fullName?: string; email?: string }) {
  await connectDb();
  const session = await findLiveSessionDoc(sessionId);
  if (!session || session.status !== "PENDING") throw new Error("Session is not pending");
  const t = pendingTimers.get(sessionId);
  if (t) clearTimeout(t);
  pendingTimers.delete(sessionId);
  session.status = "ACTIVE";
  session.assignedAdminId = admin.id;
  session.assignedAdminName = admin.fullName || admin.email;
  session.assignedAdminEmail = admin.email;
  session.acceptedAt = new Date();
  session.unreadForUser = (session.unreadForUser || 0) + 1;
  await session.save();
  const name = admin.fullName || "Support agent";
  await saveLiveMessage(sessionId, "SYSTEM", `${name} joined the chat. How can I help you today?`);
  return serializeSession(session);
}

export async function closeLiveSession(sessionId: string) {
  await connectDb();
  const session = await findLiveSessionDoc(sessionId);
  if (!session) return null;
  const t = pendingTimers.get(sessionId);
  if (t) clearTimeout(t);
  pendingTimers.delete(sessionId);
  session.status = "CLOSED";
  session.closedAt = new Date();
  await session.save();
  return serializeSession(session);
}

export async function listTicketsByLiveChatSessionId(sessionId: string) {
  await connectDb();
  const { Ticket } = getModels();
  return Ticket.find({ liveChatSessionId: sessionId }).sort({ createdAt: -1 }).lean();
}

export async function listAdminLiveSessions() {
  await connectDb();
  const { LiveSession, Ticket } = getModels();
  const items = await LiveSession.find({ status: { $in: ["PENDING", "ACTIVE", "CLOSED", "REJECTED"] } })
    .sort({ lastMessageAt: -1 })
    .limit(50)
    .lean();
  const sessionIds = items.map((s) => String(s._id));
  const tickets = sessionIds.length
    ? await Ticket.find({ liveChatSessionId: { $in: sessionIds } }).sort({ createdAt: -1 }).lean()
    : [];
  const ticketsBySession = new Map<string, { id: string; ticketNumber: string; status: string; channel: string }[]>();
  for (const t of tickets) {
    const sid = String(t.liveChatSessionId || "");
    if (!sid) continue;
    const list = ticketsBySession.get(sid) || [];
    list.push({
      id: String(t._id),
      ticketNumber: t.ticketNumber,
      status: t.status,
      channel: t.channel || "",
    });
    ticketsBySession.set(sid, list);
  }
  return items.map((s) => ({
    ...serializeSession(s),
    tickets: ticketsBySession.get(String(s._id)) || [],
  }));
}

export async function markLiveSeen(sessionId: string, forRole: "user" | "admin") {
  await connectDb();
  const { LiveSession } = getModels();
  const field = forRole === "user" ? "unreadForUser" : "unreadForAdmin";
  await LiveSession.updateOne({ _id: sessionId }, { [field]: 0 });
}

export async function countPendingCallbacks() {
  await connectDb();
  const { CallbackRequest } = getModels();
  return CallbackRequest.countDocuments({ status: "PENDING" });
}

export async function createCallbackRequest(payload: {
  phone: string;
  callerName: string;
  callerEmail?: string;
  consumerType?: string;
  ticketId?: string;
  ticketNumber?: string;
}) {
  await connectDb();
  const { CallbackRequest } = getModels();
  const ahead = await countPendingCallbacks();
  const doc = await CallbackRequest.create({
    status: "PENDING",
    phone: payload.phone,
    callerName: payload.callerName,
    callerEmail: payload.callerEmail,
    consumerType: payload.consumerType || "EMPLOYEE",
    ticketId: payload.ticketId,
    ticketNumber: payload.ticketNumber,
    queuePosition: ahead + 1,
  });
  return doc.toObject();
}

export async function getCallbackById(id: string) {
  await connectDb();
  const { CallbackRequest } = getModels();
  return CallbackRequest.findById(id).lean() as Promise<Record<string, any> | null>;
}

/** One callback request → one ticket unless admin explicitly creates another. */
export async function findTicketByCallbackRequestId(callbackId: string) {
  await connectDb();
  const { Ticket } = getModels();
  const doc = await Ticket.findOne({ callbackRequestId: callbackId }).sort({ createdAt: -1 }).lean();
  return doc ? normalizeTicketDoc(doc as Record<string, unknown>) : null;
}

export async function findRecentPendingCallback(phone: string, withinMs = 5 * 60 * 1000) {
  await connectDb();
  const { CallbackRequest } = getModels();
  const since = new Date(Date.now() - withinMs);
  return CallbackRequest.findOne({
    phone,
    status: "PENDING",
    createdAt: { $gte: since },
  })
    .sort({ createdAt: -1 })
    .lean() as Promise<Record<string, any> | null>;
}

export async function linkCallbackTicket(callbackId: string, ticketId: string, ticketNumber: string) {
  await connectDb();
  const { CallbackRequest } = getModels();
  return CallbackRequest.findByIdAndUpdate(
    callbackId,
    { ticketId, ticketNumber },
    { new: true },
  ).lean();
}

export async function updateCallbackCallMeta(
  callbackId: string,
  meta: { twilioCallSid?: string; adminPhone?: string; lastCallAttemptAt?: Date; status?: string; callNotes?: string },
) {
  await connectDb();
  const { CallbackRequest } = getModels();
  return CallbackRequest.findByIdAndUpdate(callbackId, meta, { new: true }).lean();
}

export async function listCallbackRequests(status?: string) {
  await connectDb();
  const { CallbackRequest } = getModels();
  const q = status ? { status } : {};
  return CallbackRequest.find(q).sort({ createdAt: -1 }).limit(100).lean();
}

export async function updateCallbackStatus(id: string, status: string) {
  await connectDb();
  const { CallbackRequest } = getModels();
  return CallbackRequest.findByIdAndUpdate(id, { status }, { new: true }).lean();
}
