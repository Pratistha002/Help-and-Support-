"use client";

import { CONSUMER_TYPES } from "@/lib/supportConstants";
import { IconCheck, IconMail, IconMessage, IconPhone, IconTicket, IconUser } from "./AdminIcons";
import "./help-support-notifications.css";

const CHANNEL_META: Record<string, { label: string; icon: typeof IconTicket; color: string }> = {
  TICKET_FORM: { label: "Form", icon: IconTicket, color: "#6366f1" },
  EMAIL: { label: "Email", icon: IconMail, color: "#3b82f6" },
  CALL: { label: "Call", icon: IconPhone, color: "#f97316" },
  LIVE_CHAT: { label: "Live Chat", icon: IconMessage, color: "#0d9488" },
  SMS: { label: "SMS", icon: IconMessage, color: "#8b5cf6" },
  ADMIN_RAISED: { label: "Live Agent", icon: IconTicket, color: "#7c3aed" },
};

function consumerLabel(id?: string) {
  return CONSUMER_TYPES.find((c) => c.id === id)?.label || id || "User";
}

function formatWhen(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

type Notification = {
  id: string;
  title?: string;
  message?: string;
  read?: boolean;
  createdAt?: string;
  eventType?: string;
  sourceChannel?: string;
  consumerType?: string;
  customerName?: string;
  ticketNumber?: string;
  liveChatSessionId?: string;
  callbackRequestId?: string;
};

export function HelpSupportTicketNotifications({
  notifications = [],
  loading = false,
  onMarkRead,
  onMarkAllRead,
  onOpenTicket,
}: {
  notifications?: Notification[];
  loading?: boolean;
  onMarkRead?: (id: string) => void;
  onMarkAllRead?: () => void;
  onOpenTicket?: (n: Notification) => void;
}) {
  const listContent = loading ? (
    <p className="hs-admin-hub__empty">Loading notifications…</p>
  ) : notifications.length === 0 ? (
    <p className="hs-admin-hub__empty">No alerts yet. New tickets, live chats, and call requests will appear here.</p>
  ) : (
    <ul className="hs-admin-hub__notif-list hs-admin-hub__notif-list--popup">
      {notifications.map((n) => {
        const channelKey = n.sourceChannel || "TICKET_FORM";
        const channel = CHANNEL_META[channelKey] || CHANNEL_META.TICKET_FORM;
        const ChannelIcon = channel.icon;
        const isUnread = !n.read;
        const isLiveChat = n.eventType === "LIVE_CHAT_REQUEST" || Boolean(n.liveChatSessionId);
        const isCallback = n.eventType === "CALLBACK_REQUEST" || Boolean(n.callbackRequestId);
        const displayTitle = isLiveChat
          ? (n.title || "Live chat request")
          : isCallback
            ? (n.title || "Call request")
            : (n.ticketNumber || n.title || "New ticket");

        return (
          <li key={n.id} className={`hs-admin-hub__notif-item${isUnread ? " hs-admin-hub__notif-item--unread" : ""}`}>
            <button
              type="button"
              className="hs-admin-hub__notif-item-btn"
              onClick={() => {
                if (isUnread && onMarkRead) onMarkRead(n.id);
                onOpenTicket?.(n);
              }}
            >
              <span
                className="hs-admin-hub__notif-channel"
                style={{ background: `${channel.color}18`, color: channel.color }}
                aria-hidden
              >
                <ChannelIcon size={14} />
              </span>
              <div className="hs-admin-hub__notif-body">
                <div className="hs-admin-hub__notif-row">
                  <strong>{displayTitle}</strong>
                  <span className="hs-admin-hub__notif-time">{formatWhen(n.createdAt)}</span>
                </div>
                <p className="hs-admin-hub__notif-message">{n.message || n.title}</p>
                <div className="hs-admin-hub__notif-meta">
                  <span className="hs-admin-hub__notif-type">
                    <IconUser size={12} aria-hidden />
                    {consumerLabel(n.consumerType)}
                  </span>
                  <span className="hs-admin-hub__notif-type">{channel.label}</span>
                  {n.customerName ? <span className="hs-admin-hub__notif-name">{n.customerName}</span> : null}
                </div>
              </div>
              {isUnread ? <span className="hs-admin-hub__notif-dot" aria-label="Unread" /> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="hs-admin-hub__notif-popup-body">
      {notifications.length > 0 && onMarkAllRead ? (
        <div className="hs-admin-hub__notif-popup-toolbar">
          <button type="button" className="hs-admin-hub__notif-mark-all" onClick={onMarkAllRead}>
            <IconCheck size={14} aria-hidden />
            Mark all read
          </button>
        </div>
      ) : null}
      {listContent}
    </div>
  );
}
