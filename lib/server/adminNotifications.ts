import mongoose, { Schema } from "mongoose";
import { connectDb } from "./db";
import type { TicketDoc } from "./store";

export const ADMIN_AUDIENCE = "ADMIN";

export type AdminNotificationDoc = {
  _id: mongoose.Types.ObjectId;
  id: string;
  audience: string;
  ticketId?: string;
  ticketNumber?: string;
  customerName?: string;
  consumerType?: string;
  sourceChannel?: string;
  liveChatSessionId?: string;
  callbackRequestId?: string;
  title: string;
  message: string;
  eventType: string;
  read: boolean;
  createdAt: Date;
};

const notificationSchema = new Schema(
  {
    audience: { type: String, default: ADMIN_AUDIENCE, index: true },
    ticketId: String,
    ticketNumber: String,
    customerName: String,
    consumerType: String,
    sourceChannel: String,
    liveChatSessionId: String,
    callbackRequestId: String,
    title: { type: String, required: true },
    message: { type: String, required: true },
    eventType: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "workforce_support_notifications" },
);

function getNotificationModel() {
  return mongoose.models.SupportNotification || mongoose.model("SupportNotification", notificationSchema);
}

function serializeNotification(doc: Record<string, unknown>): AdminNotificationDoc {
  const id = String(doc._id);
  return {
    _id: doc._id as mongoose.Types.ObjectId,
    id,
    audience: String(doc.audience || ADMIN_AUDIENCE),
    ticketId: doc.ticketId != null ? String(doc.ticketId) : undefined,
    ticketNumber: doc.ticketNumber != null ? String(doc.ticketNumber) : undefined,
    customerName: doc.customerName != null ? String(doc.customerName) : undefined,
    consumerType: doc.consumerType != null ? String(doc.consumerType) : undefined,
    sourceChannel: doc.sourceChannel != null ? String(doc.sourceChannel) : undefined,
    liveChatSessionId: doc.liveChatSessionId != null ? String(doc.liveChatSessionId) : undefined,
    callbackRequestId: doc.callbackRequestId != null ? String(doc.callbackRequestId) : undefined,
    title: String(doc.title || ""),
    message: String(doc.message || ""),
    eventType: String(doc.eventType || ""),
    read: Boolean(doc.read),
    createdAt: doc.createdAt as Date,
  };
}

async function saveAdminNotification(payload: Omit<AdminNotificationDoc, "_id" | "id" | "createdAt" | "read" | "audience">) {
  await connectDb();
  const Notification = getNotificationModel();
  const doc = await Notification.create({
    audience: ADMIN_AUDIENCE,
    ...payload,
    read: false,
  });
  return serializeNotification(doc.toObject() as Record<string, unknown>);
}

export async function notifyAdminNewTicket(ticket: TicketDoc | Record<string, unknown>) {
  const ticketId = String(ticket._id || ticket.id || "");
  if (!ticketId) return null;
  const ticketNumber = String(ticket.ticketNumber || "—");
  const name = String(ticket.name || ticket.userName || "Customer").trim() || "Customer";
  const consumer = String(ticket.consumerType || "EMPLOYEE");
  const channel = String(ticket.sourceChannel || ticket.channel || "TICKET_FORM");
  const subject = String(ticket.subject || "Support request").trim() || "Support request";
  return saveAdminNotification({
    ticketId,
    ticketNumber,
    customerName: name,
    consumerType: consumer,
    sourceChannel: channel,
    title: `New ticket ${ticketNumber}`,
    message: `${name} · ${consumer} via ${channel} — ${subject}`,
    eventType: "TICKET_CREATED",
  });
}

export async function notifyAdminLiveChatRequest(session: {
  _id?: unknown;
  id?: string;
  userName?: string;
  consumerType?: string;
  initialMessage?: string;
  serviceLabel?: string;
  ticketId?: string;
}, ticketNumber?: string) {
  const sessionId = String(session._id || session.id || "");
  if (!sessionId) return null;
  const name = String(session.userName || "Customer").trim() || "Customer";
  const consumer = String(session.consumerType || "EMPLOYEE");
  let preview = String(session.initialMessage || session.serviceLabel || "Live agent support").trim();
  if (preview.length > 120) preview = `${preview.slice(0, 117)}...`;
  const title = ticketNumber ? `Live chat · ${ticketNumber}` : "Live chat request";
  return saveAdminNotification({
    liveChatSessionId: sessionId,
    ticketId: session.ticketId ? String(session.ticketId) : undefined,
    ticketNumber,
    customerName: name,
    consumerType: consumer,
    sourceChannel: "LIVE_CHAT",
    title,
    message: `${name} (${consumer}) is waiting for a live agent — ${preview}`,
    eventType: "LIVE_CHAT_REQUEST",
  });
}

export async function notifyAdminCallbackRequest(request: {
  _id?: unknown;
  id?: string;
  callerName?: string;
  consumerType?: string;
  phone?: string;
  queuePosition?: number;
}) {
  const callbackId = String(request._id || request.id || "");
  if (!callbackId) return null;
  const name = String(request.callerName || "Customer").trim() || "Customer";
  const consumer = String(request.consumerType || "EMPLOYEE");
  const phone = String(request.phone || "—").trim() || "—";
  const position = request.queuePosition;
  const queueHint = position && position > 0 ? `Queue position #${position}` : "Pending in callback queue";
  return saveAdminNotification({
    callbackRequestId: callbackId,
    customerName: name,
    consumerType: consumer,
    sourceChannel: "CALL",
    title: "Call request",
    message: `${name} (${consumer}) requested a callback to ${phone} — ${queueHint}`,
    eventType: "CALLBACK_REQUEST",
  });
}

export async function getAdminNotifications() {
  await connectDb();
  const Notification = getNotificationModel();
  const docs = await Notification.find({ audience: ADMIN_AUDIENCE })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return docs.map((d) => serializeNotification(d as Record<string, unknown>));
}

export async function getAdminUnreadCount() {
  await connectDb();
  const Notification = getNotificationModel();
  return Notification.countDocuments({ audience: ADMIN_AUDIENCE, read: false });
}

export async function markAdminNotificationRead(notificationId: string) {
  await connectDb();
  const Notification = getNotificationModel();
  const doc = await Notification.findById(notificationId);
  if (!doc || doc.audience !== ADMIN_AUDIENCE) return;
  doc.read = true;
  await doc.save();
}

export async function markAllAdminNotificationsRead() {
  await connectDb();
  const Notification = getNotificationModel();
  await Notification.updateMany({ audience: ADMIN_AUDIENCE, read: false }, { $set: { read: true } });
}
