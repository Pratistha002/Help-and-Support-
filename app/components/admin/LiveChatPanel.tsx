"use client";

import { useEffect, useRef, useState } from "react";
import { IconChevronDown, IconChevronUp, IconSend } from "./AdminIcons";
import "./LiveChatPanel.css";

type Message = {
  id?: string;
  senderType?: string;
  senderRole?: string;
  senderName?: string;
  content?: string;
  createdAt?: string;
};

type QuickReplyGroup = { label: string; suggestions: string[] };

type Props = {
  title?: string;
  subtitle?: string;
  peerName?: string;
  peerOnline?: boolean;
  status?: string;
  messages?: Message[];
  sending?: boolean;
  typing?: boolean;
  input?: string;
  onInputChange?: (value: string) => void;
  onSend?: () => void;
  inputDisabled?: boolean;
  showInput?: boolean;
  waitingMessage?: string;
  viewAs?: "user" | "admin";
  quickReplyGroups?: QuickReplyGroup[];
};

function formatTime(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function isOwnMessage(message: Message, viewAs: "user" | "admin") {
  if (message.senderRole === "SYSTEM" || message.senderType === "SYSTEM") return false;
  if (viewAs === "admin") {
    return message.senderRole === "AGENT" || message.senderType === "ADMIN";
  }
  return message.senderRole === "USER" || message.senderType === "USER";
}

function isSystemMessage(message: Message) {
  return message.senderRole === "SYSTEM" || message.senderType === "SYSTEM";
}

export function LiveChatPanel({
  title = "Live Support",
  subtitle,
  peerName = "Support",
  peerOnline = false,
  status,
  messages = [],
  sending = false,
  typing = false,
  input = "",
  onInputChange,
  onSend,
  inputDisabled = false,
  showInput = true,
  waitingMessage,
  viewAs = "user",
  quickReplyGroups = [],
}: Props) {
  const messagesRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);
  const isAdminView = viewAs === "admin";
  const [quickRepliesOpen, setQuickRepliesOpen] = useState(false);

  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;

    const count = messages.length;
    const messageCountGrew = count > prevMessageCountRef.current;
    prevMessageCountRef.current = count;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isNearBottom = distanceFromBottom < 96;

    if (messageCountGrew || typing || isNearBottom) {
      requestAnimationFrame(() => {
        if (messagesRef.current) {
          messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }
      });
    }
  }, [messages, typing]);

  useEffect(() => {
    prevMessageCountRef.current = 0;
    const el = messagesRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [status, title]);

  const canSend = showInput && !inputDisabled && input.trim() && !sending;
  const showPeerOnline = peerOnline || typing;
  const showQuickReplies =
    viewAs === "admin" && showInput && quickReplyGroups.length > 0 && status === "ACTIVE";

  const applyQuickReply = (text: string) => {
    onInputChange?.(text);
  };

  return (
    <div className={`lc-panel${isAdminView ? " lc-panel--admin" : ""}`}>
      <div className="lc-panel__head">
        <div className="lc-panel__head-left">
          <div className="lc-panel__head-title-row">
            <h3>{title}</h3>
            {isAdminView ? (
              <span
                className={`lc-panel__status lc-panel__status--inline${showPeerOnline ? "" : " lc-panel__status--offline-text"}`}
              >
                <span
                  className={`lc-panel__status-dot${showPeerOnline ? "" : " lc-panel__status-dot--offline"}`}
                />
                {showPeerOnline ? "Online" : "Offline"}
              </span>
            ) : null}
          </div>
          {subtitle ? <div className="lc-panel__subtitle">{subtitle}</div> : null}
        </div>
        {!isAdminView ? (
          <div className="lc-panel__head-actions">
            <div className="lc-panel__status">
              <span
                className={`lc-panel__status-dot${showPeerOnline ? "" : " lc-panel__status-dot--offline"}`}
              />
              {showPeerOnline ? `${peerName} online` : `${peerName} offline`}
            </div>
          </div>
        ) : null}
      </div>

      <div className="lc-panel__messages" ref={messagesRef}>
        {messages.map((m) => {
          const isSystem = isSystemMessage(m);
          const isOwn = isOwnMessage(m, viewAs);
          const wrapClass = isSystem ? "lc-bubble-wrap--system" : isOwn ? "lc-bubble-wrap--own" : "lc-bubble-wrap--peer";
          const bubbleClass = isSystem ? "lc-bubble--system" : isOwn ? "lc-bubble--own" : "lc-bubble--peer";
          return (
            <div key={m.id || `${m.createdAt}-${m.content?.slice(0, 8)}`} className={`lc-bubble-wrap ${wrapClass}`}>
              {!isOwn && !isSystem && m.senderName ? (
                <div className="lc-bubble__sender">{m.senderName}</div>
              ) : null}
              <div className={`lc-bubble ${bubbleClass}`}>{m.content}</div>
              <div className="lc-bubble__meta">
                <span>{formatTime(m.createdAt)}</span>
              </div>
            </div>
          );
        })}

        {status === "CLOSED" || status === "REJECTED" ? (
          <div className="lc-session-ended">
            This chat has ended. You can go back to the AI assistant or start a new request anytime.
          </div>
        ) : null}

        {waitingMessage ? (
          <div className={`lc-waiting${status === "REJECTED" ? " lc-waiting--busy" : ""}`}>
            {status === "PENDING" ? <div className="lc-waiting__spinner" /> : null}
            <p>{waitingMessage}</p>
          </div>
        ) : null}

        {typing ? (
          <div className="lc-typing">
            <span className="lc-typing__dot" />
            <span className="lc-typing__dot" />
            <span className="lc-typing__dot" />
            {peerName} is typing…
          </div>
        ) : null}
      </div>

      {showInput ? (
        <form
          className="lc-panel__input"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSend) onSend?.();
          }}
        >
          <input
            value={input}
            onChange={(e) => onInputChange?.(e.target.value)}
            placeholder={inputDisabled ? "Accept chat to reply…" : "Type a message…"}
            disabled={inputDisabled || sending}
          />
          <button type="submit" disabled={!canSend} aria-label="Send">
            <IconSend size={16} />
          </button>
        </form>
      ) : null}

      {showQuickReplies ? (
        <div
          className={`lc-quick-replies${quickRepliesOpen ? " is-open" : " is-collapsed"} lc-quick-replies--admin`}
          aria-label="Agent quick reply suggestions"
        >
          <button
            type="button"
            className="lc-quick-replies__toggle"
            onClick={() => setQuickRepliesOpen((open) => !open)}
            aria-expanded={quickRepliesOpen}
          >
            <span>Quick replies</span>
            {quickRepliesOpen ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
          </button>
          {quickRepliesOpen ? (
            <div className="lc-quick-replies__body">
              {quickReplyGroups.map((group) => (
                <div key={group.label} className="lc-quick-replies__group">
                  <span className="lc-quick-replies__label">{group.label}</span>
                  <div className="lc-quick-replies__list">
                    {group.suggestions.map((text) => (
                      <button
                        key={text}
                        type="button"
                        className="lc-quick-replies__chip"
                        onClick={() => applyQuickReply(text)}
                        title={text}
                      >
                        {text}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
