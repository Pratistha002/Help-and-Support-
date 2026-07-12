"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { appPath } from "@/lib/apiBase";
import { supportApi } from "@/lib/supportApi";
import { LIVE_AGENT_QUICK_REPLY_GROUPS } from "@/lib/liveAgentQuickReplies";
import {
  filterSessionsByStatus,
  formatSessionTime,
  getChatColor,
  getChatInitials,
  groupSessionsByUser,
  liveChatStatusLabel,
  sessionUserKey,
  type LiveSession,
} from "@/lib/adminLiveChatGrouping";
import { LiveChatPanel } from "./LiveChatPanel";
import {
  IconBell,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconChevronUp,
  IconFileText,
  IconHeadphones,
  IconPlus,
  IconSparkle,
  IconTicket,
  IconX,
} from "./AdminIcons";
import "./AdminLiveChatSection.css";

const STATUS_FILTERS = [
  { id: "ALL", label: "All" },
  { id: "PENDING", label: "Pending" },
  { id: "ACTIVE", label: "Active" },
  { id: "CLOSED", label: "Closed" },
];

export function AdminLiveChatPanel() {
  return (
    <Suspense fallback={<p className="hs-empty hs-empty--sm">Loading live chat…</p>}>
      <AdminLiveChatPanelInner />
    </Suspense>
  );
}

function AdminLiveChatPanelInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionIdFromUrl = searchParams.get("sessionId")?.trim() || "";
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [active, setActive] = useState<LiveSession | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [endingChat, setEndingChat] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [incomingRequest, setIncomingRequest] = useState<LiveSession | null>(null);
  const [tokenFormOpen, setTokenFormOpen] = useState(false);
  const [lastRaisedToken, setLastRaisedToken] = useState<string | null>(null);
  const [raiseForm, setRaiseForm] = useState({
    subject: "",
    description: "",
    category: "General",
    phone: "",
    email: "",
    name: "",
  });
  const [submittingToken, setSubmittingToken] = useState(false);
  const [sessionFilter, setSessionFilter] = useState("ALL");
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(() => new Set());
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const pollRef = useRef<number | null>(null);
  const seenIncomingRef = useRef<Set<string>>(new Set());
  const activeIdRef = useRef<string | null>(null);
  const urlSessionHandledRef = useRef<string | null>(null);

  activeIdRef.current = active?.id || null;

  const loadMessages = useCallback(async (sessionId: string) => {
    try {
      return await supportApi.adminLiveChatMessages(sessionId);
    } catch {
      try {
        return await supportApi.liveChatMessages(sessionId);
      } catch {
        return [];
      }
    }
  }, []);

  const loadSession = useCallback(async (sessionId: string) => {
    try {
      return await supportApi.liveChatSession(sessionId);
    } catch {
      return null;
    }
  }, []);

  const loadSessions = useCallback(async ({ silent = false } = {}) => {
    try {
      const data = await supportApi.adminLiveChatSessions();
      const list = Array.isArray(data) ? data : [];
      setSessions(list);
      const currentId = activeIdRef.current;
      if (currentId && list.some((s) => s.id === currentId)) {
        const updated = list.find((s) => s.id === currentId);
        if (updated) setActive(updated);
      } else if (!currentId && list.length && !sessionIdFromUrl) {
        const pick =
          list.find((s) => s.status === "ACTIVE") ||
          list.find((s) => s.status === "PENDING") ||
          list[0];
        if (pick) {
          setActive(pick);
          setExpandedUsers((prev) => new Set(prev).add(sessionUserKey(pick)));
        }
      }
      const pending = list.filter((s) => s.status === "PENDING");
      const newestPending = pending.sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
      )[0];
      if (newestPending && !seenIncomingRef.current.has(newestPending.id)) {
        setIncomingRequest(newestPending);
      }
      return list;
    } catch {
      if (!silent) setSessions([]);
      return [];
    } finally {
      if (!silent) setLoading(false);
    }
  }, [sessionIdFromUrl]);

  const startPoll = useCallback((sessionId: string) => {
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(async () => {
      try {
        setMessages(await loadMessages(sessionId));
        const s = await loadSession(sessionId);
        if (s) setActive(s);
      } catch {
        /* ignore */
      }
    }, 2000);
  }, [loadMessages, loadSession]);

  const selectSession = useCallback(async (s: LiveSession) => {
    if (!s?.id) return;
    setActive(s);
    setExpandedUsers((prev) => new Set(prev).add(sessionUserKey(s)));
    setMessages(await loadMessages(s.id));
    startPoll(s.id);
    if (s.status === "PENDING") {
      try {
        await supportApi.liveChatSeen(s.id);
      } catch {
        /* ignore */
      }
    }
  }, [loadMessages, startPoll]);

  useEffect(() => {
    void loadSessions();
    const id = window.setInterval(() => void loadSessions({ silent: true }), 10000);
    return () => {
      window.clearInterval(id);
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [loadSessions]);

  useEffect(() => {
    if (!sessionIdFromUrl || urlSessionHandledRef.current === sessionIdFromUrl) return;

    const openFromNotification = async () => {
      let match: LiveSession | null = await loadSession(sessionIdFromUrl);
      if (!match) {
        const list = await loadSessions({ silent: true });
        match = (list || []).find((s) => s.id === sessionIdFromUrl) || null;
      }
      if (!match?.id) return;

      urlSessionHandledRef.current = sessionIdFromUrl;
      if (match.status === "PENDING") {
        setSessionFilter("PENDING");
      }
      setExpandedUsers((prev) => new Set(prev).add(sessionUserKey(match!)));
      if (match.status === "PENDING") {
        seenIncomingRef.current.delete(match.id);
        setIncomingRequest(match);
      }
      await selectSession(match);

      const params = new URLSearchParams(searchParams.toString());
      params.delete("sessionId");
      router.replace(`${appPath("admin")}?${params.toString()}`);
    };

    void openFromNotification();
  }, [sessionIdFromUrl, loadSessions, loadSession, selectSession, router, searchParams]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("hs-admin-live-chat-lock");
    const prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      root.classList.remove("hs-admin-live-chat-lock");
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);

  useEffect(() => {
    if (!active?.id) return;
    void (async () => {
      setMessages(await loadMessages(active.id));
      startPoll(active.id);
    })();
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [active?.id, loadMessages, startPoll]);

  const accept = async (session: LiveSession) => {
    const id = session.id;
    if (!id || acceptingId) return;
    setAcceptingId(id);
    try {
      const s = await supportApi.adminLiveChatAccept(id);
      setActive(s);
      seenIncomingRef.current.add(id);
      setIncomingRequest(null);
      await loadSessions({ silent: true });
      setMessages(await loadMessages(id));
      startPoll(id);
      setToast("Chat accepted — conversation started");
      window.setTimeout(() => setToast(""), 3000);
    } catch (err: any) {
      setToast(err?.message || "Could not accept chat");
    } finally {
      setAcceptingId(null);
    }
  };

  const dismissIncoming = (session: LiveSession) => {
    seenIncomingRef.current.add(session.id);
    setIncomingRequest(null);
  };

  const endChat = async () => {
    if (!active?.id) return;
    if (!window.confirm(`End chat with ${active.userName || "this user"}?`)) return;
    setEndingChat(true);
    try {
      const s = await supportApi.liveChatClose(active.id);
      setActive(s);
      await loadSessions({ silent: true });
      if (pollRef.current) window.clearInterval(pollRef.current);
      setToast("Chat ended");
      window.setTimeout(() => setToast(""), 3000);
    } catch (err: any) {
      setToast(err?.message || "Could not end chat");
    } finally {
      setEndingChat(false);
    }
  };

  const send = async () => {
    if (!active?.id || !input.trim() || active.status !== "ACTIVE" || sending) return;
    setSending(true);
    const text = input.trim();
    setInput("");
    try {
      const msg = await supportApi.adminLiveChatSend(active.id, text);
      setMessages((p) => [...p, msg]);
    } catch (err: any) {
      setInput(text);
      setToast(err?.message || "Send failed");
    } finally {
      setSending(false);
    }
  };

  const prefillRaiseForm = (session: LiveSession) => {
    setRaiseForm((f) => ({
      ...f,
      subject:
        f.subject ||
        (session.serviceLabel
          ? `Live chat: ${session.serviceLabel}`
          : session.initialMessage
            ? `Live chat: ${String(session.initialMessage).slice(0, 80)}`
            : ""),
      phone: session.userPhone || f.phone || "",
      email: session.userEmail || f.email || "",
      name: session.userName || f.name || "",
      description: f.description || session.initialMessage || "",
    }));
  };

  const toggleTokenForm = () => {
    setTokenFormOpen((open) => {
      if (!open && active) prefillRaiseForm(active);
      return !open;
    });
  };

  const submitRaiseTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active) return;
    setSubmittingToken(true);
    try {
      const ticket = await supportApi.adminRaiseTicket({
        email: raiseForm.email || active.userEmail,
        name: raiseForm.name || active.userName,
        subject: raiseForm.subject,
        description: raiseForm.description,
        category: raiseForm.category,
        phone: raiseForm.phone || undefined,
        userId: active.userId,
        liveChatSessionId: active.id,
        consumerType: active.consumerType,
      });
      const token = ticket.ticketNumber;
      setLastRaisedToken(token);
      setToast(`Ticket ${token} created`);
      setTokenFormOpen(false);
      setRaiseForm({ subject: "", description: "", category: "General", phone: "", email: "", name: "" });
      await loadSessions({ silent: true });
      window.setTimeout(() => setToast(""), 4000);
    } catch (err: any) {
      setToast(err?.message || "Failed to raise ticket");
    } finally {
      setSubmittingToken(false);
    }
  };

  const pendingCount = sessions.filter((s) => s.status === "PENDING").length;
  const activeCount = sessions.filter((s) => s.status === "ACTIVE").length;
  const closedCount = sessions.filter((s) => s.status === "CLOSED" || s.status === "REJECTED").length;

  const filteredSessions = useMemo(
    () => filterSessionsByStatus(sessions, sessionFilter),
    [sessions, sessionFilter],
  );

  const userGroups = useMemo(() => groupSessionsByUser(filteredSessions), [filteredSessions]);

  const toggleUserExpanded = (key: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const aiSummary = useMemo(() => {
    if (active?.initialMessage) {
      return `The user requested help via live chat: "${String(active.initialMessage).slice(0, 200)}${(active.initialMessage?.length || 0) > 200 ? "…" : ""}"`;
    }
    if (messages.length) return "Review the conversation above for issue context.";
    if (active?.status === "PENDING") return "Accept the chat to begin the conversation.";
    return "No messages yet — select a chat or wait for a new request.";
  }, [active, messages.length]);

  return (
    <div className="hs-live-chat">
      {toast ? <div className="sx-help-toast">{toast}</div> : null}

      {tokenFormOpen ? (
        <div className="hs-live-chat__token-drawer hs-live-chat__token-drawer--overlay">
          <div className="hs-live-chat__token-drawer-head">
            <IconFileText size={16} />
            <div>
              <h3>New support ticket</h3>
              <p>
                {active
                  ? "Details prefilled from the selected chat. Review and submit."
                  : "Create a support ticket linked to this live chat."}
              </p>
            </div>
            <button
              type="button"
              className="hs-live-chat__token-drawer-close"
              onClick={() => setTokenFormOpen(false)}
              aria-label="Close"
            >
              <IconX size={16} />
            </button>
          </div>
          <form className="hs-live-chat__token-form" onSubmit={submitRaiseTicket}>
            <div className="hs-live-chat__form-section">
              <span className="hs-live-chat__form-section-title">Customer info</span>
              <div className="hs-live-chat__token-grid">
                <div className="hs-live-chat__form-field">
                  <label>
                    Customer name <abbr title="required">*</abbr>
                  </label>
                  <input
                    required
                    placeholder="Full name"
                    value={raiseForm.name}
                    onChange={(e) => setRaiseForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="hs-live-chat__form-field">
                  <label>Email</label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={raiseForm.email}
                    onChange={(e) => setRaiseForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div className="hs-live-chat__form-field">
                  <label>Phone</label>
                  <input
                    placeholder="+91..."
                    value={raiseForm.phone}
                    onChange={(e) => setRaiseForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div className="hs-live-chat__form-section">
              <span className="hs-live-chat__form-section-title">Ticket details</span>
              <div className="hs-live-chat__form-field">
                <label>Category</label>
                <select
                  value={raiseForm.category}
                  onChange={(e) => setRaiseForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {["General", "Account & Login", "TalentX", "Live Chat", "Technical Support", "Resume Builder"].map(
                    (c) => (
                      <option key={c}>{c}</option>
                    ),
                  )}
                </select>
              </div>
              <div className="hs-live-chat__form-field">
                <label>Subject</label>
                <input
                  required
                  placeholder="Brief one-line summary"
                  value={raiseForm.subject}
                  onChange={(e) => setRaiseForm((f) => ({ ...f, subject: e.target.value }))}
                />
              </div>
              <div className="hs-live-chat__form-field">
                <label>
                  Problem / details <abbr title="required">*</abbr>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe the user's issue from the chat"
                  value={raiseForm.description}
                  onChange={(e) => setRaiseForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>
            <div className="hs-live-chat__form-footer">
              <button type="button" className="hs-btn" onClick={() => setTokenFormOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="hs-btn hs-btn--primary" disabled={submittingToken}>
                <IconTicket size={15} />
                {submittingToken ? "Creating ticket…" : "Raise ticket"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {incomingRequest ? (
        <div className="hs-live-chat-modal" role="dialog" aria-modal="true">
          <div className="hs-live-chat-modal__card">
            <div className="hs-live-chat-modal__head">
              <IconBell size={20} />
              <h3>New chat request</h3>
              <button type="button" onClick={() => dismissIncoming(incomingRequest)} aria-label="Dismiss">
                <IconX size={18} />
              </button>
            </div>
            <p className="hs-live-chat-modal__user">{incomingRequest.userName}</p>
            <p className="hs-live-chat-modal__email">{incomingRequest.userEmail}</p>
            {incomingRequest.serviceLabel ? (
              <p className="hs-live-chat-modal__service">Service: {incomingRequest.serviceLabel}</p>
            ) : null}
            <p className="hs-live-chat-modal__msg">
              {incomingRequest.initialMessage || "User requested live support"}
            </p>
            <div className="hs-live-chat-modal__actions">
              <button
                type="button"
                className="hs-btn hs-btn--primary"
                onClick={() => void accept(incomingRequest)}
                disabled={acceptingId === incomingRequest.id}
              >
                <IconCheck size={16} />
                {acceptingId === incomingRequest.id ? "Accepting…" : "Accept"}
              </button>
              <button type="button" className="hs-btn" onClick={() => dismissIncoming(incomingRequest)}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="hs-live-chat__layout">
        <aside className="hs-live-chat__sidebar">
          <div className="hs-live-chat__sidebar-head">
            <IconHeadphones size={18} />
            <span>Live chats</span>
            {pendingCount > 0 ? <span className="hs-live-chat__badge">{pendingCount}</span> : null}
          </div>

          <div className="hs-live-chat__filters" role="tablist" aria-label="Chat status">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={sessionFilter === f.id}
                className={`hs-live-chat__filter${sessionFilter === f.id ? " is-active" : ""}`}
                onClick={() => setSessionFilter(f.id)}
              >
                {f.label}
                {f.id === "PENDING" && pendingCount > 0 ? (
                  <span className="hs-live-chat__filter-count">{pendingCount}</span>
                ) : null}
                {f.id === "ACTIVE" && activeCount > 0 ? (
                  <span className="hs-live-chat__filter-count">{activeCount}</span>
                ) : null}
                {f.id === "CLOSED" && closedCount > 0 ? (
                  <span className="hs-live-chat__filter-count">{closedCount}</span>
                ) : null}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="hs-empty hs-empty--sm">Loading live chats…</p>
          ) : userGroups.length === 0 ? (
            <p className="hs-empty hs-empty--sm">
              No {sessionFilter === "ALL" ? "" : sessionFilter.toLowerCase()} chats yet.
            </p>
          ) : (
            <ul className="hs-live-chat__list">
              {userGroups.map((group) => {
                const expanded = expandedUsers.has(group.key);
                const groupColor = getChatColor(group.key);
                return (
                  <li
                    key={group.key}
                    className="hs-live-chat__user-group"
                    style={
                      {
                        "--chat-color-bg": groupColor.bg,
                        "--chat-color-border": groupColor.border,
                        "--chat-color-accent": groupColor.accent,
                      } as React.CSSProperties
                    }
                  >
                    <button
                      type="button"
                      className={`hs-live-chat__user-row${expanded ? " is-expanded" : ""}`}
                      style={
                        {
                          "--chat-color-bg": groupColor.bg,
                          "--chat-color-border": groupColor.border,
                          "--chat-color-accent": groupColor.accent,
                        } as React.CSSProperties
                      }
                      onClick={() => toggleUserExpanded(group.key)}
                    >
                      <span
                        className="hs-live-chat__user-avatar"
                        style={{ background: groupColor.avatar }}
                        aria-hidden
                      >
                        {getChatInitials(group.userName)}
                      </span>
                      <IconChevronRight size={14} className="hs-live-chat__user-chevron" />
                      <div className="hs-live-chat__user-row-main">
                        <div className="hs-live-chat__item-top">
                          <strong style={{ color: groupColor.accent }}>{group.userName}</strong>
                          <span className="hs-live-chat__user-meta">
                            {group.sessions.length} chat{group.sessions.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <span className="hs-live-chat__user-email">{group.userEmail}</span>
                        <div className="hs-live-chat__user-badges">
                          {group.hasPending ? (
                            <span className="hs-live-chat__pill hs-live-chat__pill--pending">Pending</span>
                          ) : null}
                          {group.hasActive ? (
                            <span className="hs-live-chat__pill hs-live-chat__pill--active">Active</span>
                          ) : null}
                          {group.unreadTotal > 0 ? (
                            <span className="hs-live-chat__unread">{group.unreadTotal}</span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                    {expanded ? (
                      <div className="hs-live-chat__user-sessions">
                        {group.dateGroups.map(({ dateLabel, sessions: dateSessions }) => (
                          <div key={`${group.key}-${dateLabel}`} className="hs-live-chat__date-group">
                            <div className="hs-live-chat__date-label">{dateLabel}</div>
                            {dateSessions.map((s) => {
                              const sessionColor = getChatColor(s.id);
                              return (
                                <button
                                  key={s.id}
                                  type="button"
                                  className={`hs-live-chat__item hs-live-chat__item--nested hs-live-chat__item--colored${active?.id === s.id ? " is-active" : ""}`}
                                  style={
                                    {
                                      "--chat-color-bg": sessionColor.bg,
                                      "--chat-color-border": sessionColor.border,
                                      "--chat-color-accent": sessionColor.accent,
                                    } as React.CSSProperties
                                  }
                                  onClick={() => void selectSession(s)}
                                >
                                  <div className="hs-live-chat__item-top">
                                    <span className="hs-live-chat__session-time">
                                      {formatSessionTime(s.createdAt)}
                                    </span>
                                    <span
                                      className={`hs-live-chat__pill hs-live-chat__pill--${(s.status || "").toLowerCase()}`}
                                    >
                                      {liveChatStatusLabel(s.status)}
                                    </span>
                                  </div>
                                  {s.assignedAdminName && s.status === "ACTIVE" ? (
                                    <span className="hs-live-chat__agent-tag">Agent: {s.assignedAdminName}</span>
                                  ) : null}
                                  <span className="hs-live-chat__preview">
                                    {s.serviceLabel || s.initialMessage?.slice(0, 48) || "Support chat"}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <div className="hs-live-chat__main">
          {!active ? (
            <div className="hs-empty">Select a conversation or wait for a new request</div>
          ) : (
            <>
              <div className="hs-live-chat__conversation">
                <div className="hs-live-chat__toolbar">
                  <div className="hs-live-chat__toolbar-meta">
                    <span
                      className={`hs-live-chat__pill hs-live-chat__pill--${(active.status || "").toLowerCase()}`}
                    >
                      {liveChatStatusLabel(active.status)}
                    </span>
                    <span className="hs-live-chat__toolbar-context">
                      {active.consumerType || "EMPLOYEE"} · {active.serviceLabel || "General"}
                    </span>
                  </div>
                  <div className="hs-live-chat__toolbar-actions">
                    <button
                      type="button"
                      className={`hs-btn hs-btn--token hs-btn--sm${tokenFormOpen ? " is-open" : ""}`}
                      onClick={toggleTokenForm}
                      aria-expanded={tokenFormOpen}
                    >
                      <span className="hs-btn--token__icon" aria-hidden>
                        <IconTicket size={14} />
                      </span>
                      <span className="hs-btn--token__label">Raise ticket</span>
                      {lastRaisedToken ? (
                        <span className="hs-live-chat__token-last-inline">{lastRaisedToken}</span>
                      ) : null}
                    </button>
                    {active.status === "PENDING" ? (
                      <button
                        type="button"
                        className="hs-btn hs-btn--primary hs-btn--sm"
                        onClick={() => void accept(active)}
                        disabled={acceptingId === active.id}
                      >
                        {acceptingId === active.id ? "Accepting…" : "Accept chat"}
                      </button>
                    ) : null}
                    {active.status === "ACTIVE" ? (
                      <button
                        type="button"
                        className="hs-btn hs-btn--end-chat hs-btn--sm"
                        onClick={() => void endChat()}
                        disabled={endingChat}
                      >
                        {endingChat ? "Ending…" : "End chat"}
                      </button>
                    ) : null}
                  </div>
                </div>

                <LiveChatPanel
                  title={active.userName || active.userEmail || "User"}
                  subtitle={active.userEmail}
                  peerName={active.userName || "User"}
                  status={active.status}
                  messages={messages}
                  sending={sending}
                  input={input}
                  onInputChange={setInput}
                  onSend={() => void send()}
                  inputDisabled={active.status !== "ACTIVE"}
                  showInput={active.status === "ACTIVE"}
                  viewAs="admin"
                  quickReplyGroups={LIVE_AGENT_QUICK_REPLY_GROUPS}
                  waitingMessage={
                    active.status === "PENDING"
                      ? "Waiting for you to accept — click Accept chat to start."
                      : undefined
                  }
                />

                <div
                  className={`hs-live-chat__ai-insight hs-live-chat__ai-insight--footer${aiPanelOpen ? " is-open" : " is-collapsed"}`}
                >
                  <div className="hs-live-chat__ai-insight-head">
                    <button
                      type="button"
                      className="hs-live-chat__ai-insight-toggle"
                      onClick={() => setAiPanelOpen((open) => !open)}
                      aria-expanded={aiPanelOpen}
                    >
                      <IconSparkle size={16} />
                      <span>AI issue analysis</span>
                      {aiPanelOpen ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                    </button>
                  </div>
                  {aiPanelOpen ? (
                    <div className="hs-live-chat__ai-insight-body">
                      <p className="hs-live-chat__ai-text">{aiSummary}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
