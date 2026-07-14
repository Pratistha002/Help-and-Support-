"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { supportApi } from "@/lib/supportApi";
import { CONSUMER_TYPES, SUPPORT_EMAIL } from "@/lib/supportConstants";
import { TICKET_CHANNELS, TICKET_STATUSES, statusLabel, statusColor } from "@/lib/ticketConstants";
import { IconCalendar, IconChevronRightSmall, IconDownload, IconFilter, IconForm, IconInbox, IconMail, IconPhone, IconSearch, IconTag, IconTicket, IconUser } from "./AdminIcons";
import { ClientDateTime } from "./ClientDateTime";
import { TicketDetailPanel } from "./TicketDetailPanel";
import "./manage-email.css";
import "./ticket-detail.css";

const ACTIVE_QUEUE_STATUSES = ["OPEN", "IN_PROGRESS", "PENDING", "PENDING_WITH_USER", "ESCALATED"];
const TERMINAL_STATUSES = ["RESOLVED", "CLOSED"];

export type SubmissionVariant = "email" | "form" | "agent-raised" | "call";
type AgentUser = { id: string; email: string; fullName: string } | null;

function ticketId(t: any): string {
  return String(t._id || t.id);
}

function ticketUserName(t: any): string {
  return t.name || t.userName || "—";
}

function ticketUserEmail(t: any): string {
  return t.email || t.userEmail || "—";
}

function ticketUserPhone(t: any): string | undefined {
  return t.phone || t.userPhone;
}

function ticketAgentName(t: any): string | undefined {
  return t.assignedAdminName || t.assignedAgentName;
}

function ticketAgentEmail(t: any): string | undefined {
  return t.assignedAdminEmail || t.assignedAgentEmail;
}

function consumerTypeLabel(type?: string): string {
  return CONSUMER_TYPES.find((c) => c.id === type)?.label || type || "—";
}

function priorityTone(priority?: string): string {
  if (!priority) return "none";
  const p = priority.toUpperCase();
  if (p === "URGENT") return "urgent";
  if (p === "HIGH") return "high";
  if (p === "MEDIUM") return "medium";
  return "low";
}

function ticketAssignedToAgent(ticket: any, agentId?: string, agentEmail?: string) {
  if (!ticket) return false;
  const id = ticket.assignedAdminId || ticket.assignedAgentId;
  const email = String(ticket.assignedAdminEmail || ticket.assignedAgentEmail || "").toLowerCase();
  if (!id && !email) return false;
  if (agentId && id === agentId) return true;
  if (agentEmail && email === agentEmail.toLowerCase()) return true;
  return false;
}

function ticketNeedsAccept(ticket: any) {
  return !ticket?.assignedAdminId && !ticket?.assignedAgentId
    && !ticket?.assignedAdminEmail && !ticket?.assignedAgentEmail;
}

function ticketInAgeRange(ticket: any, ageFilter: string): boolean {
  if (!ageFilter) return true;
  const created = ticket.createdAt ? new Date(ticket.createdAt).getTime() : 0;
  if (!created) return true;
  const now = Date.now();
  const day = 86400000;
  if (ageFilter === "today") return now - created < day;
  if (ageFilter === "7d") return now - created < 7 * day;
  if (ageFilter === "30d") return now - created < 30 * day;
  return true;
}

function exportTicketsCsv(tickets: any[], prefix: string) {
  const headers = ["Ticket ID", "Name", "Email", "Phone", "Type", "Category", "Priority", "Subject", "Status", "Agent", "Created"];
  const escape = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = tickets.map((t) => [
    t.ticketNumber,
    ticketUserName(t),
    ticketUserEmail(t),
    ticketUserPhone(t) || "",
    consumerTypeLabel(t.consumerType),
    t.category || "",
    t.priority || "",
    t.subject || "",
    statusLabel(t.status),
    ticketAgentName(t) || "Unassigned",
    t.createdAt ? new Date(t.createdAt).toISOString() : "",
  ]);
  const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${prefix}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function StatusBadge({ status }: { status: string }) {
  const color = statusColor(status);
  return (
    <span
      className="hs-status-badge"
      style={{ color, background: `${color}18`, borderColor: `${color}40` }}
    >
      {statusLabel(status)}
    </span>
  );
}

function SubmissionKpi({ label, value, tone = "primary", highlight = false }: {
  label: string; value: number; tone?: string; highlight?: boolean;
}) {
  return (
    <div className={`hs-sub-kpi hs-sub-kpi--${tone}${highlight ? " is-highlight" : ""}`}>
      <span className="hs-sub-kpi__value">{value}</span>
      <span className="hs-sub-kpi__label">{label}</span>
    </div>
  );
}

function ManageEmailInboxBar({ ticketCount, onRefresh }: { ticketCount: number; onRefresh: () => void }) {
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    supportApi.getSupportConfig().then(setConfig).catch(() => setConfig(null));
  }, []);

  const inbox = config?.supportEmail || SUPPORT_EMAIL;
  const smtpOk = config?.mailConfigured;

  return (
    <div className="hs-inbox-bar">
      <div className="hs-inbox-bar__info">
        <IconInbox size={18} />
        <div>
          <strong>Inbound mailbox: {inbox}</strong>
          <p>
            Outbound {smtpOk ? "(Brevo/SMTP)" : "(not configured)"}
            {" · "}
            Customer emails to the inbox create support tickets
            {ticketCount > 0 && <> · {ticketCount} email ticket{ticketCount !== 1 ? "s" : ""} in queue</>}
          </p>
        </div>
      </div>
      <div className="hs-inbox-bar__actions">
        <span className={`hs-inbox-bar__badge${smtpOk ? " hs-inbox-bar__badge--ok" : " hs-inbox-bar__badge--warn"}`}>
          {smtpOk ? "Outbound ready" : "Mail not configured"}
        </span>
        <span className="hs-inbox-bar__badge hs-inbox-bar__badge--ok">OK</span>
        <button type="button" className="hs-btn hs-btn--ghost" disabled title="Configure BREVO_API_KEY in server .env">
          Test SMTP
        </button>
        <button type="button" className="hs-btn hs-btn--primary" onClick={onRefresh}>
          Sync inbox now
        </button>
      </div>
    </div>
  );
}

function TicketDetailModal({
  open,
  ticket,
  detail,
  agentUser,
  onClose,
  onAccept,
  onStatusChange,
  onSendEmail,
  onSendSms,
  accepting,
  actionStatus,
  canUpdateStatus,
  notifyEmail,
  notifySms,
  onNotifyEmailChange,
  onNotifySmsChange,
  showEmailChannel,
  onAssigned,
}: {
  open: boolean;
  ticket: any;
  detail: any;
  agentUser: AgentUser;
  onClose: () => void;
  onAccept: () => void;
  onStatusChange: (status: string) => void;
  onSendEmail: (body: string, templateId: string) => void;
  onSendSms: (message: string, templateId: string, phone?: string) => void;
  accepting: boolean;
  actionStatus: string;
  canUpdateStatus: boolean;
  notifyEmail: boolean;
  notifySms: boolean;
  onNotifyEmailChange: (v: boolean) => void;
  onNotifySmsChange: (v: boolean) => void;
  showEmailChannel?: boolean;
  onAssigned?: (data: any) => void;
}) {
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !portalReady || !ticket || !detail?.ticket) return null;

  const modal = (
    <div className="tdm" role="dialog" aria-modal="true" aria-labelledby="tdm-title">
      <button type="button" className="tdm__backdrop" onClick={onClose} aria-label="Close ticket details" />
      <div className="tdm__sheet">
        <TicketDetailPanel
          ticket={ticket}
          detail={detail}
          agentUser={agentUser}
          onClose={onClose}
          onAccept={onAccept}
          onStatusChange={onStatusChange}
          onSendEmail={onSendEmail}
          onSendSms={onSendSms}
          accepting={accepting}
          actionStatus={actionStatus}
          canUpdateStatus={canUpdateStatus}
          notifyEmail={notifyEmail}
          notifySms={notifySms}
          onNotifyEmailChange={onNotifyEmailChange}
          onNotifySmsChange={onNotifySmsChange}
          showEmailChannel={showEmailChannel}
          onAssigned={onAssigned}
        />
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

const VARIANT_CONFIG: Record<SubmissionVariant, {
  channel?: string;
  panelTitle: string;
  exportPrefix: string;
  loadingMessage: string;
  emptyTitle: string;
  emptyMessage: string;
  defaultCategory: string;
  heroIcon: ReactNode;
  loadTickets: () => Promise<any[]>;
}> = {
  email: {
    channel: TICKET_CHANNELS.EMAIL,
    panelTitle: "Email tickets",
    exportPrefix: "email-tickets",
    loadingMessage: "Loading email tickets…",
    emptyTitle: "No email tickets found",
    emptyMessage: "Try adjusting your search or filters, or check back when new emails arrive.",
    defaultCategory: "Email",
    heroIcon: <IconMail size={22} />,
    loadTickets: () => supportApi.adminTickets({ channel: TICKET_CHANNELS.EMAIL }),
  },
  form: {
    channel: TICKET_CHANNELS.TICKET_FORM,
    panelTitle: "Form submissions",
    exportPrefix: "ticket-form",
    loadingMessage: "Loading form submissions…",
    emptyTitle: "No submissions found",
    emptyMessage: "Try adjusting your search or filters, or check back when new forms are submitted.",
    defaultCategory: "General",
    heroIcon: <IconForm size={22} />,
    loadTickets: () => supportApi.adminTickets({ channel: TICKET_CHANNELS.TICKET_FORM }),
  },
  "agent-raised": {
    panelTitle: "Live agent ticket created",
    exportPrefix: "live-agent-tickets",
    loadingMessage: "Loading agent-created tickets…",
    emptyTitle: "No agent-created tickets yet",
    emptyMessage: "When an agent raises a ticket from live chat, it will appear here.",
    defaultCategory: "General",
    heroIcon: <IconTicket size={22} />,
    loadTickets: () => supportApi.adminAgentRaisedTickets(),
  },
  call: {
    channel: TICKET_CHANNELS.CALL,
    panelTitle: "Call tickets",
    exportPrefix: "call-tickets",
    loadingMessage: "Loading call tickets…",
    emptyTitle: "No call tickets yet",
    emptyMessage: "Raise a ticket from Call Management to see it here with full details.",
    defaultCategory: "Call",
    heroIcon: <IconPhone size={22} />,
    loadTickets: () => supportApi.adminTickets({ channel: TICKET_CHANNELS.CALL }),
  },
};

export function SubmissionTicketsModule({
  variant,
  agentUser,
}: {
  variant: SubmissionVariant;
  agentUser: AgentUser;
}) {
  const config = VARIANT_CONFIG[variant];
  const isForm = variant === "form";

  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [ageFilter, setAgeFilter] = useState("");
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState("");
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySms, setNotifySms] = useState(false);

  const agentId = agentUser?.id;
  const agentEmail = agentUser?.email;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await config.loadTickets();
      setTickets(Array.isArray(data) ? data : []);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 8000);
    return () => window.clearInterval(id);
  }, [load]);

  const filteredTickets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (statusFilter && t.status !== statusFilter) return false;
      if (typeFilter && t.consumerType !== typeFilter) return false;
      if (!ticketInAgeRange(t, ageFilter)) return false;
      if (!q) return true;
      const haystack = [
        t.ticketNumber,
        ticketUserName(t),
        ticketUserEmail(t),
        ticketUserPhone(t),
        t.category,
        t.issueTypeLabel,
        t.subject,
        t.description,
        t.consumerType,
        consumerTypeLabel(t.consumerType),
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [tickets, search, statusFilter, typeFilter, ageFilter]);

  const openCount = useMemo(
    () => filteredTickets.filter((t) => ACTIVE_QUEUE_STATUSES.includes(t.status)).length,
    [filteredTickets],
  );

  const highPriorityCount = useMemo(
    () => filteredTickets.filter((t) => ["HIGH", "URGENT"].includes(String(t.priority || "").toUpperCase())).length,
    [filteredTickets],
  );

  const resolvedCount = useMemo(
    () => filteredTickets.filter((t) => TERMINAL_STATUSES.includes(t.status)).length,
    [filteredTickets],
  );

  const filtersActive = Boolean(search.trim() || statusFilter || typeFilter || ageFilter);

  const openTicket = async (t: any) => {
    setSelected(t);
    setActionStatus("");
    try {
      const d = await supportApi.adminTicketDetail(ticketId(t));
      setDetail(d);
    } catch {
      setDetail(null);
    }
  };

  const refreshDetail = async (id: string) => {
    const d = await supportApi.adminTicketDetail(id);
    setDetail(d);
    await load();
  };

  const acceptTicket = async (id: string) => {
    setAcceptingId(id);
    setActionStatus("");
    try {
      const r = await supportApi.adminAcceptTicket(id);
      if (selected && ticketId(selected) === id) await refreshDetail(id);
      else await load();
      setActionStatus(r.ticket?.assignedAdminName
        ? `Ticket assigned to ${r.ticket.assignedAdminName}`
        : "Ticket accepted");
    } catch (e: any) {
      setActionStatus(e?.message || "Could not accept ticket");
    } finally {
      setAcceptingId(null);
    }
  };

  const changeStatus = async (status: string) => {
    if (!selected) return;
    const id = ticketId(selected);
    setActionStatus("Updating status…");
    try {
      const r = await supportApi.adminUpdateTicketStatus(id, status, { notifyEmail, notifySms });
      await refreshDetail(id);
      const notes: string[] = ["Status updated."];
      if (r.notifications?.email) notes.push(`Email: ${r.notifications.email}`);
      if (r.notifications?.sms) notes.push(`SMS: ${r.notifications.sms}`);
      setActionStatus(notes.join(" "));
    } catch (e: any) {
      setActionStatus(e?.message || "Status update failed");
    }
  };

  const sendEmail = async (body: string, templateId: string) => {
    if (!selected || !detail) return;
    setActionStatus("Sending email…");
    try {
      const r = await supportApi.adminSendEmail({ ticketId: ticketId(selected), templateId, body });
      setActionStatus(r.message || "Email sent");
      await refreshDetail(ticketId(selected));
    } catch (e: any) {
      setActionStatus(e?.message || "Email failed");
    }
  };

  const sendSms = async (message: string, templateId: string, phone?: string) => {
    if (!selected || !detail) return;
    setActionStatus("Sending SMS…");
    try {
      const payload: Record<string, string> = { ticketId: ticketId(selected), templateId, message };
      if (phone) payload.phone = phone;
      const r = await supportApi.adminSendSms(payload);
      setActionStatus(r.message || "SMS sent");
      await refreshDetail(ticketId(selected));
    } catch (e: any) {
      setActionStatus(e?.message || "SMS failed");
    }
  };

  const canUpdateStatus = detail?.ticket
    ? ticketAssignedToAgent(detail.ticket, agentId, agentEmail)
    : false;

  const renderAgentCell = (t: any) => {
    if (!TERMINAL_STATUSES.includes(t.status) && ticketNeedsAccept(t)) {
      return (
        <button
          type="button"
          className="hs-ticket-accept-btn"
          disabled={acceptingId === ticketId(t)}
          onClick={(e) => {
            e.stopPropagation();
            void acceptTicket(ticketId(t));
          }}
        >
          {acceptingId === ticketId(t) ? "…" : "Accept"}
        </button>
      );
    }
    const name = ticketAgentName(t);
    const email = ticketAgentEmail(t);
    if (!name && !email) {
      return <span className="hs-sub-agent hs-sub-agent--none">Unassigned</span>;
    }
    const isMe = ticketAssignedToAgent(t, agentId, agentEmail);
    return (
      <span
        className={`hs-sub-agent hs-sub-agent--assigned${isMe ? " hs-sub-agent--mine" : ""}`}
        title={email || name}
      >
        <IconUser size={12} />
        <span className="hs-sub-agent__text">
          <span className="hs-sub-agent__name">{name || "—"}</span>
          {email && <span className="hs-sub-agent__email">{email}</span>}
          {isMe && <span className="hs-sub-agent__you">You</span>}
        </span>
      </span>
    );
  };

  return (
    <>
      {variant === "email" && (
        <ManageEmailInboxBar ticketCount={tickets.length} onRefresh={() => void load()} />
      )}

      <div className="hs-submissions-panel-wrap">
        <div className={`hs-submissions-panel hs-submissions-panel--${variant}`}>
          {variant !== "agent-raised" && variant !== "email" && variant !== "call" ? (
            <div className={`hs-submissions-panel__hero hs-submissions-panel__hero--${variant}`}>
              <div className="hs-submissions-panel__hero-main">
                <div className={`hs-submissions-panel__hero-icon hs-submissions-panel__hero-icon--${variant}`} aria-hidden>
                  {config.heroIcon}
                </div>
                <div>
                  <h2>{config.panelTitle}</h2>
                  {!loading && (
                    <p className="hs-panel__head-sub">
                      {filteredTickets.length} of {tickets.length} shown
                      {filtersActive && " (filtered)"}
                      {openCount > 0 && ` · ${openCount} need attention`}
                      {" · Use View to open ticket details"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {variant === "email" && !loading ? (
            <div className="hs-submissions-panel__summary">
              <p>
                <strong>{filteredTickets.length}</strong> of {tickets.length} email tickets shown
                {filtersActive ? " (filtered)" : ""}
                {openCount > 0 ? ` · ${openCount} need attention` : ""}
              </p>
            </div>
          ) : null}

          {!loading && (
            <div className="hs-submissions-panel__kpis">
              <SubmissionKpi label="Total" value={filteredTickets.length} tone="primary" />
              <SubmissionKpi label="Open" value={openCount} tone="warning" highlight={openCount > 0} />
              <SubmissionKpi label="High priority" value={highPriorityCount} tone="danger" highlight={highPriorityCount > 0} />
              <SubmissionKpi label="Resolved" value={resolvedCount} tone="success" />
            </div>
          )}

          <div className="hs-submissions-panel__controls">
            <div className="hs-submissions-panel__search">
              <IconSearch size={16} />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ticket ID, user, category, problem…"
                aria-label={`Search ${config.panelTitle}`}
              />
            </div>
            <div className="hs-submissions-panel__filters">
              <label className="hs-submissions-panel__filter">
                <IconFilter size={14} />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
                  <option value="">All statuses</option>
                  {TICKET_STATUSES.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </label>
              <label className="hs-submissions-panel__filter">
                <IconTag size={14} />
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filter by user type">
                  <option value="">All types</option>
                  {CONSUMER_TYPES.filter((c) => c.id !== "ADMIN").map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </label>
              <label className="hs-submissions-panel__filter">
                <IconCalendar size={14} />
                <select value={ageFilter} onChange={(e) => setAgeFilter(e.target.value)} aria-label="Filter by age">
                  <option value="">Any age</option>
                  <option value="today">Today</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                </select>
              </label>
              <button
                type="button"
                className="hs-ticket-export-btn"
                onClick={() => exportTicketsCsv(filteredTickets, config.exportPrefix)}
                disabled={!filteredTickets.length}
              >
                <IconDownload size={14} />
                Export CSV
              </button>
            </div>
          </div>

          {loading ? (
            <div className="hs-submissions-panel__loading">{config.loadingMessage}</div>
          ) : filteredTickets.length === 0 ? (
            <div className="hs-submissions-empty">
              <img
                className="hs-submissions-empty__art"
                src="/illustrations/empty-inbox.svg"
                alt=""
                width={220}
                height={160}
              />
              <h3>{config.emptyTitle}</h3>
              <p>{config.emptyMessage}</p>
            </div>
          ) : (
            <div className="hs-submissions-table-wrap">
              <table className="hs-submissions-table">
                <thead>
                  <tr>
                    {["Ticket", "User", "Type", "Category", "Priority", "Problem", "Status", "Agent", "Created", "Actions"].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((t) => {
                    const initial = (ticketUserName(t) || ticketUserEmail(t) || "?").charAt(0).toUpperCase();
                    const id = ticketId(t);
                    const issueLabel = t.issueTypeLabel || (isForm && t.subject ? String(t.subject).slice(0, 48) : null);
                    return (
                      <tr
                        key={id}
                        className={selected && ticketId(selected) === id ? "is-selected" : ""}
                      >
                        <td><span className="hs-sub-ticket-id">{t.ticketNumber}</span></td>
                        <td>
                          <div className="hs-sub-user">
                            <span className="hs-sub-user__avatar" aria-hidden>{initial}</span>
                            <div>
                              <div className="hs-sub-user__name">{ticketUserName(t)}</div>
                              <div className="hs-sub-user__email">{ticketUserEmail(t)}</div>
                            </div>
                          </div>
                        </td>
                        <td><span className="hs-sub-type">{consumerTypeLabel(t.consumerType)}</span></td>
                        <td>
                          <div className="hs-sub-category">
                            <span>{t.category || config.defaultCategory}</span>
                            {issueLabel && <span className="hs-sub-category__issue">{issueLabel}</span>}
                          </div>
                        </td>
                        <td>
                          <span className={`hs-sub-priority hs-sub-priority--${priorityTone(t.priority)}`}>
                            {t.priority || "—"}
                          </span>
                        </td>
                        <td className="hs-sub-problem">
                          <div className="hs-sub-problem__subject">{t.subject || "—"}</div>
                          {t.description && <div className="hs-sub-problem__desc">{t.description}</div>}
                          {ticketUserPhone(t) && <div className="hs-sub-problem__phone">{ticketUserPhone(t)}</div>}
                        </td>
                        <td><StatusBadge status={t.status} /></td>
                        <td className="hs-sub-agent-cell">{renderAgentCell(t)}</td>
                        <td className="hs-sub-date">
                          <ClientDateTime
                            value={t.createdAt}
                            options={{ month: "short", day: "numeric", year: "numeric" }}
                          />
                        </td>
                        <td className="hs-table__action" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="hs-sub-view-btn"
                            onClick={() => void openTicket(t)}
                          >
                            View
                            <IconChevronRightSmall size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <TicketDetailModal
        open={Boolean(selected && detail)}
        ticket={selected}
        detail={detail}
        agentUser={agentUser}
        onClose={() => { setSelected(null); setDetail(null); setActionStatus(""); }}
        onAccept={() => selected && void acceptTicket(ticketId(selected))}
        onStatusChange={(s) => void changeStatus(s)}
        onSendEmail={(body, templateId) => void sendEmail(body, templateId)}
        onSendSms={(message, templateId, phone) => void sendSms(message, templateId, phone)}
        accepting={acceptingId === (selected ? ticketId(selected) : null)}
        actionStatus={actionStatus}
        canUpdateStatus={canUpdateStatus}
        notifyEmail={notifyEmail}
        notifySms={notifySms}
        onNotifyEmailChange={setNotifyEmail}
        onNotifySmsChange={setNotifySms}
        showEmailChannel={variant === "email"}
        onAssigned={async (data) => {
          if (selected) await refreshDetail(ticketId(selected));
          const parts = [data?.message || "Assigned to technical team."];
          if (data?.emailSent) parts.push("Email sent to assignee.");
          if (data?.smsSent) parts.push("SMS sent to assignee.");
          if (data?.emailError) parts.push(`Email issue: ${data.emailError}`);
          if (data?.smsError) parts.push(`SMS issue: ${data.smsError}`);
          setActionStatus(parts.join(" "));
        }}
      />
    </>
  );
}
