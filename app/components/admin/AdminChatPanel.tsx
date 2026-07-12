"use client";

import { useEffect, useRef } from "react";
import "./AdminChatPanel.css";

type Message = {
  id?: string;
  senderType?: string;
  senderName?: string;
  content?: string;
  createdAt?: string;
};

type Props = {
  title: string;
  subtitle?: string;
  peerName?: string;
  status?: string;
  messages: Message[];
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  inputDisabled?: boolean;
  showInput?: boolean;
  waitingMessage?: string;
};

function formatTime(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function AdminChatPanel({
  title,
  subtitle,
  peerName = "User",
  status,
  messages,
  input,
  onInputChange,
  onSend,
  inputDisabled = false,
  showInput = true,
  waitingMessage,
}: Props) {
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, waitingMessage]);

  const canSend = showInput && !inputDisabled && input.trim();

  return (
    <div className="alc-panel">
      <div className="alc-panel__head">
        <div className="alc-panel__head-left">
          <h3>{title}</h3>
          {subtitle ? <div className="alc-panel__subtitle">{subtitle}</div> : null}
        </div>
        <div className="alc-panel__status">
          <span className="alc-panel__status-dot" />
          {peerName} online
        </div>
      </div>

      <div className="alc-panel__messages" ref={messagesRef}>
        {messages.map((m) => {
          const isSystem = m.senderType === "SYSTEM";
          const isAdmin = m.senderType === "ADMIN";
          const wrapClass = isSystem ? "alc-bubble-wrap--system" : isAdmin ? "alc-bubble-wrap--own" : "alc-bubble-wrap--peer";
          const bubbleClass = isSystem ? "alc-bubble--system" : isAdmin ? "alc-bubble--own" : "alc-bubble--peer";
          return (
            <div key={m.id || `${m.createdAt}-${m.content?.slice(0, 8)}`} className={`alc-bubble-wrap ${wrapClass}`}>
              {!isAdmin && !isSystem && m.senderName ? <div className="alc-bubble__sender">{m.senderName}</div> : null}
              <div className={`alc-bubble ${bubbleClass}`}>
                {isAdmin && m.senderName ? <b>{m.senderName}: </b> : null}
                {m.content}
              </div>
              <div className="alc-bubble__meta">{formatTime(m.createdAt)}</div>
            </div>
          );
        })}

        {status === "CLOSED" || status === "REJECTED" ? (
          <div className="alc-session-ended">
            Chat ended. Thank you for contacting SaarthiWorkforce Support.
          </div>
        ) : null}

        {(status === "CLOSED" || status === "REJECTED") && (
          <div className="alc-session-ended alc-session-ended--muted">
            This chat has ended. You can scroll up to read the full history.
          </div>
        )}

        {waitingMessage ? <div className="alc-waiting">{waitingMessage}</div> : null}
      </div>

      {showInput ? (
        <form
          className="alc-panel__input"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSend) onSend();
          }}
        >
          <input
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={inputDisabled ? "Accept chat to reply…" : "Type your reply…"}
            disabled={inputDisabled}
          />
          <button type="submit" disabled={!canSend}>
            Send
          </button>
        </form>
      ) : null}
    </div>
  );
}
