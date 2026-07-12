"use client";

import { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { IconBell, IconX } from "./AdminIcons";
import { HelpSupportTicketNotifications } from "./HelpSupportTicketNotifications";
import "./help-support-notifications.css";

const POPUP_WIDTH = 580;
const POPUP_MAX_HEIGHT = 720;

function getPopupPosition() {
  if (typeof window === "undefined") {
    return { top: 48, left: 24, width: POPUP_WIDTH, maxHeight: POPUP_MAX_HEIGHT };
  }
  const width = Math.min(POPUP_WIDTH, window.innerWidth - 48);
  const maxHeight = Math.min(POPUP_MAX_HEIGHT, window.innerHeight - 48);
  const left = Math.max(24, (window.innerWidth - width) / 2);
  const top = Math.max(24, (window.innerHeight - maxHeight) / 2);
  return { top, left, width, maxHeight };
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
  ticketId?: string;
  liveChatSessionId?: string;
  callbackRequestId?: string;
};

export function HelpSupportNotificationBell({
  notifications = [],
  unreadCount = 0,
  loading = false,
  onMarkRead,
  onMarkAllRead,
  onOpenTicket,
  placement = "hero",
}: {
  notifications?: Notification[];
  unreadCount?: number;
  loading?: boolean;
  onMarkRead?: (id: string) => void;
  onMarkAllRead?: () => void;
  onOpenTicket?: (n: Notification) => void;
  placement?: "hero" | "navbar" | "desk";
}) {
  const [open, setOpen] = useState(false);
  const [popupPos, setPopupPos] = useState(() => getPopupPosition());
  const rootRef = useRef<HTMLDivElement>(null);
  const prevUnreadRef = useRef(unreadCount);

  const updatePopupPosition = useCallback(() => {
    setPopupPos(getPopupPosition());
  }, []);

  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      setOpen(true);
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    updatePopupPosition();
    window.addEventListener("resize", updatePopupPosition);
    window.addEventListener("scroll", updatePopupPosition, true);
    return () => {
      window.removeEventListener("resize", updatePopupPosition);
      window.removeEventListener("scroll", updatePopupPosition, true);
    };
  }, [open, updatePopupPosition]);

  useEffect(() => {
    if (!open) return undefined;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onEscape);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEscape);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const wrapClass = [
    "hs-admin-hub__notif-bell-wrap",
    placement === "navbar" ? "hs-notif-bell--navbar" : "",
    placement === "hero" ? "hs-notif-bell--hero" : "",
    placement === "desk" ? "hs-notif-bell--desk" : "",
  ].filter(Boolean).join(" ");

  const popup = open ? (
    <>
      <button
        type="button"
        className="hs-admin-hub__notif-backdrop"
        aria-label="Close notifications"
        onClick={() => setOpen(false)}
      />
      <div
        className="hs-admin-hub__notif-popup hs-admin-hub__notif-popup--portal"
        role="dialog"
        aria-modal="true"
        aria-label="Support ticket notifications"
        style={{
          position: "fixed",
          top: popupPos.top,
          left: popupPos.left,
          width: popupPos.width,
          maxHeight: popupPos.maxHeight,
        }}
      >
        <div className="hs-admin-hub__notif-popup-head">
          <div>
            <strong>Notifications</strong>
            <p>New tickets, live chats, and call requests</p>
          </div>
          <div className="hs-admin-hub__notif-popup-actions">
            {unreadCount > 0 ? (
              <span className="hs-admin-hub__notif-badge">{unreadCount} new</span>
            ) : null}
            <button
              type="button"
              className="hs-admin-hub__notif-popup-close"
              onClick={() => setOpen(false)}
              aria-label="Close notifications"
            >
              <IconX size={18} />
            </button>
          </div>
        </div>
        <HelpSupportTicketNotifications
          notifications={notifications}
          loading={loading}
          onMarkRead={onMarkRead}
          onMarkAllRead={onMarkAllRead}
          onOpenTicket={(notification) => {
            setOpen(false);
            onOpenTicket?.(notification);
          }}
        />
      </div>
    </>
  ) : null;

  return (
    <>
      <div className={wrapClass} ref={rootRef}>
        <button
          type="button"
          className={`hs-admin-hub__notif-bell${open ? " is-open" : ""}${unreadCount > 0 ? " has-unread" : ""}`}
          onClick={() => {
            if (!open) updatePopupPosition();
            setOpen((value) => !value);
          }}
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
          aria-expanded={open}
          aria-haspopup="dialog"
        >
          <IconBell size={18} aria-hidden />
          {unreadCount > 0 ? (
            <span className="hs-admin-hub__notif-bell-count" aria-hidden>
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </button>
      </div>
      {popup && typeof document !== "undefined" ? createPortal(popup, document.body) : null}
    </>
  );
}
