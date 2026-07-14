"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supportApi } from "@/lib/supportApi";
import { TICKET_CHANNELS, TICKET_STATUSES, statusLabel, statusColor } from "@/lib/ticketConstants";
import {
  CALLBACK_STATUSES,
  callbackStatusLabel,
  callbackStatusColor,
  callbackReference,
} from "@/lib/callbackConstants";
import {
  SUPPORT_EMAIL_TEMPLATES,
  SUPPORT_SMS_TEMPLATES,
  renderTemplate,
  buildTemplateVars,
} from "@/lib/supportTemplates";
import type { AdminSoftphoneHandle, SoftphoneState } from "./AdminSoftphone";
import { AgentSoftphonePanel } from "./AgentSoftphonePanel";
import { CallCustomerBackPanel } from "./CallCustomerBackPanel";
import { CallbackQueueRow } from "./CallbackQueueRow";
import { CallManagementNav } from "./CallManagementNav";
import { SubmissionTicketsModule } from "./SubmissionTicketsModule";
import { IconAlertCircle, IconChart, IconListOrdered, IconPhone, IconTicket } from "./AdminIcons";
import "./call-management.css";
import "./manage-email.css";
import "./ticket-detail.css";

type CustomerHistoryData = { callbacks: any[]; tickets: any[] };
type AgentUser = { id: string; email: string; fullName: string } | null;

const ACTIVE_TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "PENDING", "PENDING_WITH_USER", "ESCALATED"];

function customerInitials(name?: string | null): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatRelativeTime(value?: string | Date | null): string {
  if (!value) return "—";
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function pickPrimaryCallback(items: any[]) {
  return items.find((c) => c.status === "PENDING") || items[0];
}

function CustomerHistoryBlock({
  history,
  selectedCallbackId,
  selectedTicketId,
  onSelectCallback,
  onSelectTicket,
}: {
  history: CustomerHistoryData;
  selectedCallbackId?: string;
  selectedTicketId?: string;
  onSelectCallback?: (c: any) => void;
  onSelectTicket?: (t: any) => void;
}) {
  const callbacks = history.callbacks || [];
  const tickets = history.tickets || [];
  const total = callbacks.length + tickets.length;
  if (total <= 1) return null;

  return (
    <div className="admin-customer-history">
      <div className="admin-customer-history__head">
        <h4>All activity for this customer</h4>
        <span className="admin-customer-count-badge">{total} total</span>
      </div>
      {onSelectCallback && callbacks.length > 0 ? (
        <div className="admin-customer-history-section">
          <p className="admin-customer-history-section__label">Callback requests ({callbacks.length})</p>
          <ul className="admin-customer-history-list">
            {callbacks.map((c) => {
              const status = c.status === "COMPLETED" ? "RESOLVED" : c.status;
              return (
                <li key={String(c._id)}>
                  <button
                    type="button"
                    className={`admin-customer-history-item${String(selectedCallbackId) === String(c._id) ? " selected" : ""}`}
                    onClick={() => onSelectCallback(c)}
                  >
                    <span className="admin-customer-history-item__id">
                      {c.ticketNumber || callbackReference(String(c._id))}
                    </span>
                    <span className="admin-customer-history-item__meta">
                      {c.createdAt
                        ? new Date(c.createdAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : "—"}
                    </span>
                    <span
                      className="admin-customer-history-item__status"
                      style={{
                        color: callbackStatusColor(status),
                        background: `${callbackStatusColor(status)}18`,
                        borderColor: `${callbackStatusColor(status)}40`,
                      }}
                    >
                      {callbackStatusLabel(status)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      {onSelectTicket && tickets.length > 0 ? (
        <div className="admin-customer-history-section">
          <p className="admin-customer-history-section__label">Support tickets ({tickets.length})</p>
          <ul className="admin-customer-history-list">
            {tickets.map((t) => {
              const color = statusColor(t.status);
              return (
                <li key={String(t._id || t.id)}>
                  <button
                    type="button"
                    className={`admin-customer-history-item${String(selectedTicketId) === String(t._id || t.id) ? " selected" : ""}`}
                    onClick={() => onSelectTicket(t)}
                  >
                    <span className="admin-customer-history-item__id">{t.ticketNumber || "—"}</span>
                    <span className="admin-customer-history-item__meta" title={t.subject || undefined}>
                      {t.subject || "Untitled"}
                    </span>
                    <span
                      className="admin-customer-history-item__status"
                      style={{
                        color,
                        background: `${color}18`,
                        borderColor: `${color}40`,
                      }}
                    >
                      {statusLabel(t.status)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function CallMetricPrimary({ label, value, tone = "neutral" }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className={`hs-call-metric-primary hs-call-metric-primary--${tone}`}>
      <span className="hs-call-metric-primary__value">{value}</span>
      <span className="hs-call-metric-primary__label">{label}</span>
    </div>
  );
}

function CallMetricLive({
  label, value, hint, tone = "neutral", alert = false,
}: { label: string; value: string | number; hint?: string; tone?: string; alert?: boolean }) {
  return (
    <div className={`hs-call-metric-live hs-call-metric-live--${tone}${alert ? " is-alert" : ""}`}>
      <span className="hs-call-metric-live__label">{label}</span>
      <span className="hs-call-metric-live__value">{value}</span>
      {hint && <span className="hs-call-metric-live__hint">{hint}</span>}
    </div>
  );
}

function CallMetricFact({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="hs-call-metric-fact">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function buildCallStats(callbacks: any[], callTickets: any[]) {
  const pending = callbacks.filter((c) => c.status === "PENDING").length;
  const connected = callbacks.filter((c) => c.status === "CONNECTED").length;
  const resolved = callbacks.filter((c) => c.status === "RESOLVED" || c.status === "COMPLETED").length;
  const notConnected = callbacks.filter((c) => c.status === "NOT_CONNECTED").length;
  const withAttempt = callbacks.filter((c) => c.lastCallAttemptAt || c.twilioCallSid).length;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const today = callbacks.filter((c) => c.createdAt && new Date(c.createdAt) >= todayStart).length;
  const openTickets = callTickets.filter((t) => ACTIVE_TICKET_STATUSES.includes(t.status)).length;

  const byStatus: Record<string, number> = {
    Completed: resolved,
    Busy: notConnected,
    "No Answer": notConnected,
    Canceled: callbacks.filter((c) => c.status === "NOT_CONNECTED").length,
    Pending: pending,
    Connected: connected,
  };

  const incoming = callbacks.length;
  const answered = connected + resolved;
  const answerRate = incoming > 0 ? Math.round((answered / incoming) * 100) : 0;

  return {
    incomingCalls: incoming,
    outgoingCalls: withAttempt,
    receivedCalls: answered,
    missedCalls: notConnected,
    queuedCallbacks: pending,
    dialingCallbacks: connected,
    activeCalls: connected,
    totalCalls: callbacks.length,
    todayCalls: today,
    todayIncoming: today,
    todayOutgoing: 0,
    avgDurationSeconds: null as number | null,
    withRecording: 0,
    ticketsCreated: callTickets.filter((t) => t.callbackRequestId).length,
    callTicketsOpen: openTickets,
    callTicketsTotal: callTickets.length,
    byStatus,
    answerRate,
  };
}

function callStatusLabel(status: string): string {
  if (!status) return "Unknown";
  return status.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function callStatusClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "completed" || s === "answered" || s === "resolved" || s === "connected") return "hs-call-status hs-call-status--ok";
  if (s === "in-progress" || s === "ringing" || s === "queued" || s === "pending" || s === "dialing") return "hs-call-status hs-call-status--active";
  if (s === "no answer" || s === "busy" || s === "failed" || s === "canceled" || s === "not connected" || s === "missed") return "hs-call-status hs-call-status--missed";
  return "hs-call-status";
}

function callStatusBarClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "completed" || s === "answered" || s === "resolved" || s === "connected") return "hs-call-status-bar__fill hs-call-status-bar__fill--ok";
  if (s === "in-progress" || s === "ringing" || s === "queued" || s === "pending" || s === "dialing") return "hs-call-status-bar__fill hs-call-status-bar__fill--active";
  if (s === "no answer" || s === "busy" || s === "failed" || s === "canceled" || s === "not connected" || s === "missed") return "hs-call-status-bar__fill hs-call-status-bar__fill--missed";
  return "hs-call-status-bar__fill";
}

function CallbackDetailSheet({
  selected,
  ticketDetail,
  customerHistory,
  detailTab,
  setDetailTab,
  linkedTicket,
  adminOnline,
  useSoftphone,
  softphoneState,
  callInProgress,
  actionStatus,
  emailTemplateId,
  setEmailTemplateId,
  smsTemplateId,
  setSmsTemplateId,
  emailPreview,
  setEmailPreview,
  smsPreview,
  setSmsPreview,
  notifyEmail,
  setNotifyEmail,
  notifySms,
  setNotifySms,
  onClose,
  onUpdateCallbackStatus,
  onInitiateCall,
  onOpenCallCreateTicket,
  onSelectCallback,
  onOpenCustomerTicket,
  onSendCustomerEmail,
  onSendCustomerSms,
  onChangeTicketStatus,
}: {
  selected: any;
  ticketDetail: any;
  customerHistory: CustomerHistoryData;
  detailTab: "overview" | "contact" | "ticket";
  setDetailTab: (t: "overview" | "contact" | "ticket") => void;
  linkedTicket: boolean;
  adminOnline: boolean;
  useSoftphone: boolean;
  softphoneState: SoftphoneState;
  callInProgress: boolean;
  actionStatus: string;
  emailTemplateId: string;
  setEmailTemplateId: (v: string) => void;
  smsTemplateId: string;
  setSmsTemplateId: (v: string) => void;
  emailPreview: string;
  setEmailPreview: (v: string) => void;
  smsPreview: string;
  setSmsPreview: (v: string) => void;
  notifyEmail: boolean;
  setNotifyEmail: (v: boolean) => void;
  notifySms: boolean;
  setNotifySms: (v: boolean) => void;
  onClose: () => void;
  onUpdateCallbackStatus: (s: string) => void;
  onInitiateCall: () => void;
  onOpenCallCreateTicket: () => void;
  onSelectCallback: (c: any) => void;
  onOpenCustomerTicket: (t: any) => void;
  onSendCustomerEmail: () => void;
  onSendCustomerSms: () => void;
  onChangeTicketStatus: (s: string) => void;
}) {
  const closeSafely = () => {
    // Defer unmount so the same click can't fall through onto "Raise ticket" behind the sheet.
    window.setTimeout(() => onClose(), 0);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSafely();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  const statusValue = selected.status === "COMPLETED" ? "RESOLVED" : selected.status;
  const statusColorValue = callbackStatusColor(statusValue);

  const modal = (
    <div className="tdm" role="dialog" aria-modal="true" aria-labelledby="hs-callback-detail-title">
      <button
        type="button"
        className="tdm__backdrop"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          closeSafely();
        }}
        aria-label="Close"
      />
      <div className="tdm__sheet" onMouseDown={(e) => e.stopPropagation()}>
        <div className="tdp admin-call-detail">
          <header className="tdp__header admin-call-detail__header">
            <div className="admin-call-detail-head">
              <span className="admin-customer-avatar admin-customer-avatar--lg" aria-hidden>
                {customerInitials(selected.callerName)}
              </span>
              <div className="admin-call-detail-title">
                <div className="admin-call-detail-title__row">
                  <h2 id="hs-callback-detail-title">{callbackReference(String(selected._id))}</h2>
                  <span
                    className="admin-call-detail__status-pill"
                    style={{
                      color: statusColorValue,
                      background: `${statusColorValue}18`,
                      borderColor: `${statusColorValue}40`,
                    }}
                  >
                    {callbackStatusLabel(statusValue)}
                  </span>
                </div>
                <p className="tdp__header-meta">
                  <strong>{selected.callerName || "Unknown"}</strong>
                  {selected.phone ? <span>{selected.phone}</span> : null}
                  {selected.callerEmail ? <span>{selected.callerEmail}</span> : null}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="tdp__close"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                closeSafely();
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              Close
            </button>
          </header>

          <div className="tdp__tabs" role="tablist">
            {(["overview", "contact", ...(linkedTicket ? ["ticket"] as const : [])] as const).map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                className={`tdp__tab${detailTab === id ? " is-active" : ""}`}
                onClick={() => setDetailTab(id)}
              >
                {id === "overview" ? "Callback" : id === "contact" ? "Contact" : `Ticket ${ticketDetail?.ticket?.ticketNumber || ""}`}
              </button>
            ))}
          </div>

          <div className="tdp__body">
            {detailTab === "overview" && (
              <>
                {!linkedTicket ? (
                  <div className="admin-call-banner admin-call-banner--info">
                    This is a <strong>callback request only</strong> — not a support ticket yet.{" "}
                    <button
                      type="button"
                      className="admin-call-banner__link"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onOpenCallCreateTicket();
                      }}
                    >
                      Create ticket
                    </button>{" "}
                    after the call if you need follow-up.
                  </div>
                ) : null}

                <div className="admin-call-meta-cards">
                  <div className="admin-call-meta-card">
                    <span className="admin-call-meta-card__label">Queue</span>
                    <span className="admin-call-meta-card__value">#{selected.queuePosition ?? "—"}</span>
                  </div>
                  <div className="admin-call-meta-card">
                    <span className="admin-call-meta-card__label">Consumer</span>
                    <span className="admin-call-meta-card__value">{selected.consumerType || "—"}</span>
                  </div>
                  <div className="admin-call-meta-card">
                    <span className="admin-call-meta-card__label">Requested</span>
                    <span className="admin-call-meta-card__value">
                      {selected.createdAt
                        ? new Date(selected.createdAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : "—"}
                    </span>
                  </div>
                  {linkedTicket ? (
                    <div className="admin-call-meta-card">
                      <span className="admin-call-meta-card__label">Ticket</span>
                      <span className="admin-call-meta-card__value">{ticketDetail.ticket.ticketNumber}</span>
                    </div>
                  ) : null}
                </div>

                <CustomerHistoryBlock
                  history={customerHistory}
                  selectedCallbackId={String(selected._id)}
                  selectedTicketId={selected.ticketId ? String(selected.ticketId) : undefined}
                  onSelectCallback={onSelectCallback}
                  onSelectTicket={onOpenCustomerTicket}
                />

                <div className="admin-status-change admin-status-change--card">
                  <label htmlFor="hs-callback-status">Callback status</label>
                  <select
                    id="hs-callback-status"
                    value={statusValue}
                    onChange={(e) => onUpdateCallbackStatus(e.target.value)}
                  >
                    {CALLBACK_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>

                <div className="admin-call-actions admin-call-actions--sticky">
                  <button
                    type="button"
                    className="admin-btn-accept"
                    disabled={!adminOnline || callInProgress || (useSoftphone && softphoneState !== "ready")}
                    onClick={onInitiateCall}
                  >
                    {callInProgress
                      ? softphoneState === "live" ? "On call…" : "Calling…"
                      : useSoftphone ? "Call back (browser)" : "Call back (phone)"}
                  </button>
                  <button
                    type="button"
                    className="admin-btn-sm admin-btn-create-ticket"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onOpenCallCreateTicket();
                    }}
                  >
                    {selected.ticketId ? "Create another ticket" : "Create ticket"}
                  </button>
                </div>
                {actionStatus ? <p className="admin-action-status">{actionStatus}</p> : null}
              </>
            )}
            {detailTab === "contact" && (
              <>
                {(selected.callerEmail || ticketDetail?.ticket?.email || selected.ticketId) ? (
                  <div className="admin-composer admin-email-composer">
                    <h4>Send email</h4>
                    <select value={emailTemplateId} onChange={(e) => setEmailTemplateId(e.target.value)}>
                      {SUPPORT_EMAIL_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                    <textarea rows={6} value={emailPreview} onChange={(e) => setEmailPreview(e.target.value)} />
                    <button type="button" className="admin-btn-sm" onClick={onSendCustomerEmail} disabled={!emailPreview.trim()}>Send email</button>
                  </div>
                ) : <p className="admin-hint">No email on file for this customer.</p>}
                {selected.phone ? (
                  <div className="admin-composer admin-sms-composer">
                    <h4>Send SMS</h4>
                    <select value={smsTemplateId} onChange={(e) => setSmsTemplateId(e.target.value)}>
                      {SUPPORT_SMS_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                    <textarea rows={3} value={smsPreview} onChange={(e) => setSmsPreview(e.target.value)} maxLength={320} />
                    <button type="button" className="admin-btn-sm" onClick={onSendCustomerSms} disabled={!smsPreview.trim()}>Send SMS to {selected.phone}</button>
                  </div>
                ) : <p className="admin-hint">No phone on file for this customer.</p>}
              </>
            )}
            {detailTab === "ticket" && linkedTicket && ticketDetail?.ticket ? (
              <>
                <div className="admin-ticket-info-grid">
                  <p><b>Ticket:</b> {ticketDetail.ticket.ticketNumber}</p>
                  <p><b>Status:</b> {statusLabel(ticketDetail.ticket.status)}</p>
                  <p><b>Subject:</b> {ticketDetail.ticket.subject || "—"}</p>
                  <p><b>Priority:</b> {ticketDetail.ticket.priority || "—"}</p>
                </div>
                <div className="admin-status-change admin-status-change--card">
                  <label htmlFor="hs-ticket-status">Ticket status</label>
                  <select
                    id="hs-ticket-status"
                    value={ticketDetail.ticket.status}
                    onChange={(e) => onChangeTicketStatus(e.target.value)}
                  >
                    {TICKET_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                  <label className="admin-inline-check">
                    <input type="checkbox" checked={notifyEmail} onChange={(e) => setNotifyEmail(e.target.checked)} />
                    Notify email
                  </label>
                  <label className="admin-inline-check">
                    <input type="checkbox" checked={notifySms} onChange={(e) => setNotifySms(e.target.checked)} />
                    Notify SMS
                  </label>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

export function CallManagementModule({ agentUser = null }: { agentUser?: AgentUser }) {
  const [callbacks, setCallbacks] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [ticketDetail, setTicketDetail] = useState<any>(null);
  const [customerHistory, setCustomerHistory] = useState<CustomerHistoryData>({ callbacks: [], tickets: [] });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [adminOnline, setAdminOnline] = useState(false);
  const [adminPhone, setAdminPhone] = useState("");
  const [actionStatus, setActionStatus] = useState("");
  const [calling, setCalling] = useState(false);
  const [showRaiseTicket, setShowRaiseTicket] = useState(false);
  const [raiseCallbackId, setRaiseCallbackId] = useState<string | null>(null);
  const [raisingTicket, setRaisingTicket] = useState(false);
  const [raiseForm, setRaiseForm] = useState({ subject: "", description: "", category: "Call", email: "", name: "", phone: "" });
  const [emailTemplateId, setEmailTemplateId] = useState(SUPPORT_EMAIL_TEMPLATES[0]?.id || "");
  const [smsTemplateId, setSmsTemplateId] = useState(SUPPORT_SMS_TEMPLATES[0]?.id || "");
  const [emailPreview, setEmailPreview] = useState("");
  const [smsPreview, setSmsPreview] = useState("");
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySms, setNotifySms] = useState(false);
  const [callConfig, setCallConfig] = useState<any>(null);
  const softphoneRef = useRef<AdminSoftphoneHandle>(null);
  const [softphoneState, setSoftphoneState] = useState<SoftphoneState>("offline");
  const [usePhoneFallback, setUsePhoneFallback] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCallSetup, setShowCallSetup] = useState(false);
  const [callBackLoadingId, setCallBackLoadingId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<"overview" | "contact" | "ticket">("overview");
  const [callTickets, setCallTickets] = useState<any[]>([]);
  const [viewTickets, setViewTickets] = useState(false);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("hs-admin-callback-phone") : "";
    if (saved) setAdminPhone(saved);
    supportApi.getCallConfig().then(setCallConfig).catch(() => null);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cb, tickets] = await Promise.all([
        supportApi.adminCallbacks(),
        supportApi.adminTickets({ channel: TICKET_CHANNELS.CALL }),
      ]);
      setCallbacks(Array.isArray(cb) ? cb : []);
      setCallTickets(Array.isArray(tickets) ? tickets : []);
    } catch {
      setCallbacks([]);
      setCallTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 8000);
    return () => window.clearInterval(id);
  }, [load]);

  const loadTicketDetail = useCallback(async (ticketId: string) => {
    try {
      const d = await supportApi.adminTicketDetail(ticketId);
      setTicketDetail(d);
      const statusTpl = SUPPORT_EMAIL_TEMPLATES.find((x) => x.forStatus === d.ticket.status);
      if (statusTpl) setEmailTemplateId(statusTpl.id);
    } catch {
      setTicketDetail(null);
    }
  }, []);

  const selectCallback = async (c: any) => {
    setSelected(c);
    setDetailTab("overview");
    setActionStatus("");
    try {
      const history = await supportApi.adminCustomerHistory({ phone: c.phone, email: c.callerEmail });
      setCustomerHistory(history);
    } catch {
      setCustomerHistory({ callbacks: [], tickets: [] });
    }
    if (c.ticketId) await loadTicketDetail(String(c.ticketId));
    else setTicketDetail(null);
  };

  const refreshSelected = async () => {
    await load();
    if (!selected?._id) return;
    const fresh = (await supportApi.adminCallbacks()).find((c: any) => String(c._id) === String(selected._id));
    if (fresh) {
      setSelected(fresh);
      try {
        const history = await supportApi.adminCustomerHistory({ phone: fresh.phone, email: fresh.callerEmail });
        setCustomerHistory(history);
      } catch {
        setCustomerHistory({ callbacks: [], tickets: [] });
      }
      if (fresh.ticketId) await loadTicketDetail(String(fresh.ticketId));
    }
  };

  const updateCallbackStatus = async (status: string) => {
    if (!selected) return;
    setActionStatus("Updating…");
    try {
      await supportApi.adminUpdateCallback(String(selected._id), status);
      await refreshSelected();
      setActionStatus("Callback status updated.");
    } catch (e: any) {
      setActionStatus(e?.message || "Update failed");
    }
  };

  const initiateCall = async () => {
    await placeCallbackCall(selected);
  };

  const placeCallbackCall = async (c: any, loadingKey?: string | null) => {
    if (!c) { setActionStatus("Select a callback request first."); return; }
    if (!adminOnline) { setActionStatus('Go online on the softphone before placing calls.'); return; }
    if (!callConfig?.smsConfigured) {
      setActionStatus("Twilio is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to .env");
      return;
    }
    const softphoneReady = Boolean(callConfig?.softphoneConfigured) && !usePhoneFallback;
    if (softphoneReady) {
      if (!softphoneRef.current?.isReady()) {
        setActionStatus("Softphone is starting — allow microphone access and wait until it shows Ready.");
        return;
      }
      if (loadingKey) setCallBackLoadingId(loadingKey);
      setCalling(true);
      setActionStatus("Calling customer from browser softphone…");
      try {
        await softphoneRef.current.placeCall(String(c._id), c.phone);
      } catch (e: any) {
        setActionStatus(e?.message || "Softphone call failed");
        setCalling(false);
        if (loadingKey) setCallBackLoadingId(null);
      }
      return;
    }
    const phone = adminPhone.trim();
    if (!phone) { setActionStatus("Enter your phone number in advanced options, or enable browser softphone."); return; }
    window.localStorage.setItem("hs-admin-callback-phone", phone);
    if (loadingKey) setCallBackLoadingId(loadingKey);
    setCalling(true);
    setActionStatus("Starting callback call to your phone…");
    try {
      const r = await supportApi.adminInitiateCallback(String(c._id), phone, adminOnline);
      setActionStatus(r.message || "Call initiated — your phone will ring when the customer answers.");
      await refreshSelected();
    } catch (e: any) {
      setActionStatus(e?.message || "Call failed");
    } finally {
      setCalling(false);
      if (loadingKey) setCallBackLoadingId(null);
    }
  };

  const handleQueueDial = async (callbackId: string) => {
    const c = callbacks.find((x) => String(x._id) === String(callbackId));
    if (!c) return;
    setSelected(c);
    await placeCallbackCall(c, `queue-${callbackId}`);
  };

  const handleManualCallBack = async (phone: string) => {
    const trimmed = phone.trim();
    const c =
      callbacks.find((x) => x.phone === trimmed && ["PENDING", "NOT_CONNECTED"].includes(x.status)) ||
      callbacks.find((x) => x.phone === trimmed);
    if (!c) {
      setActionStatus(`No callback request found for ${trimmed}. The customer must request a call on Help & Support first.`);
      return;
    }
    setSelected(c);
    await placeCallbackCall(c, `manual-${trimmed}`);
  };

  const handleCallbackUpdate = async (
    id: string,
    payload: {
      status?: string;
      markResolved?: boolean;
      markNotConnected?: boolean;
      markPending?: boolean;
      markConnected?: boolean;
    },
  ) => {
    let status = payload.status;
    if (payload.markConnected) status = "CONNECTED";
    if (payload.markResolved) status = "RESOLVED";
    if (payload.markNotConnected) status = "NOT_CONNECTED";
    if (payload.markPending) status = "PENDING";
    if (!status) return null;
    try {
      await supportApi.adminUpdateCallback(id, status);
      setActionStatus(`Status updated to ${status.replace(/_/g, " ").toLowerCase()}.`);
      await load();
      if (selected && String(selected._id) === String(id)) {
        const fresh = (await supportApi.adminCallbacks()).find((c: any) => String(c._id) === String(id));
        if (fresh) setSelected(fresh);
      }
      return { item: { id, status } };
    } catch (e: any) {
      setActionStatus(e?.message || "Failed to update status");
      return null;
    }
  };

  const selectQueueRow = (id: string) => {
    const c = callbacks.find((x) => String(x._id) === String(id));
    if (c) void selectCallback(c);
  };

  const openRaiseTicketForCallback = (id: string) => {
    if (Date.now() < raiseTicketGuardUntil.current) return;
    const c = callbacks.find((x) => String(x._id) === String(id));
    if (!c) {
      setActionStatus("Call request not found.");
      return;
    }
    // Only open the raise-ticket modal — do not open the detail sheet underneath.
    setSelected(null);
    setTicketDetail(null);
    setRaiseCallbackId(String(c._id));
    setRaiseForm({
      subject: `Callback: ${c.callerName || "Customer"}`,
      description: `Callback request from ${c.callerName || "customer"} (${c.phone || "n/a"}).\nQueue position: #${c.queuePosition ?? "—"}.`,
      category: "Call",
      email: c.callerEmail || "",
      name: c.callerName || "",
      phone: c.phone || "",
    });
    setShowRaiseTicket(true);
  };

  const raiseTicketGuardUntil = useRef(0);

  const closeRaiseTicket = () => {
    // Block accidental click-through from reopening Raise / Create ticket.
    raiseTicketGuardUntil.current = Date.now() + 600;
    setShowRaiseTicket(false);
    setRaiseCallbackId(null);
  };

  const openCallCreateTicket = () => {
    if (Date.now() < raiseTicketGuardUntil.current) return;
    if (selected) {
      setRaiseCallbackId(String(selected._id));
      setRaiseForm({
        subject: `Callback: ${selected.callerName || "Customer"}`,
        description: `Callback request from ${selected.callerName || "customer"} (${selected.phone || "n/a"}).\nQueue position: #${selected.queuePosition ?? "—"}.`,
        category: "Call",
        email: selected.callerEmail || "",
        name: selected.callerName || "",
        phone: selected.phone || "",
      });
    } else {
      setRaiseCallbackId(null);
      setRaiseForm({
        subject: "",
        description: "",
        category: "Call",
        email: "",
        name: "",
        phone: "",
      });
    }
    setShowRaiseTicket(true);
  };

  const handleNavRaiseTicket = () => {
    if (Date.now() < raiseTicketGuardUntil.current) return;
    // Toggle: if already open, close instead of stacking another open.
    if (showRaiseTicket) {
      closeRaiseTicket();
      return;
    }
    openCallCreateTicket();
  };

  const onSoftphoneCallEnded = useCallback(async () => {
    setCalling(false);
    setCallBackLoadingId(null);
    await refreshSelected();
  }, [refreshSelected]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    (window as any).__hsSupportSoftphone = {
      isReady: () => Boolean(adminOnline && softphoneRef.current?.isReady()),
    };
    return () => {
      delete (window as any).__hsSupportSoftphone;
    };
  }, [adminOnline, softphoneState]);

  useEffect(() => {
    if (!selected) return;
    const ticket = ticketDetail?.ticket;
    const vars = ticket
      ? buildTemplateVars(ticket)
      : buildTemplateVars({
          name: selected.callerName,
          email: selected.callerEmail,
          ticketNumber: ticket?.ticketNumber || callbackReference(String(selected._id)),
          subject: `Callback from ${selected.callerName}`,
          status: selected.status,
        });
    const emailTpl = SUPPORT_EMAIL_TEMPLATES.find((t) => t.id === emailTemplateId);
    const smsTpl = SUPPORT_SMS_TEMPLATES.find((t) => t.id === smsTemplateId);
    setEmailPreview(emailTpl ? renderTemplate(emailTpl.body, vars) : "");
    setSmsPreview(smsTpl ? renderTemplate(smsTpl.body, vars) : "");
  }, [selected, ticketDetail, emailTemplateId, smsTemplateId]);

  const submitRaiseTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (raisingTicket) return;

    const name = raiseForm.name.trim();
    const phone = raiseForm.phone.trim();
    const email = raiseForm.email.trim();
    const subject = raiseForm.subject.trim();
    const description = raiseForm.description.trim();
    if (!name || !phone || !email || !subject || !description) {
      setActionStatus("Please fill name, phone, email, subject, and description.");
      return;
    }

    setRaisingTicket(true);
    const linkedCallbackId = raiseCallbackId;
    try {
      const payload: Record<string, unknown> = {
        forceNew: true,
        name,
        phone,
        email,
        subject,
        description,
        category: raiseForm.category || "Call",
      };
      if (linkedCallbackId) payload.callbackId = linkedCallbackId;

      const r = await supportApi.adminRaiseCallTicket(payload);
      const ticket = r.ticket || r;
      const ticketNumber = ticket?.ticketNumber || "—";
      const ticketId = ticket?._id || ticket?.id;

      closeRaiseTicket();
      setRaiseForm({ subject: "", description: "", category: "Call", email: "", name: "", phone: "" });
      setActionStatus(`Ticket ${ticketNumber} created.`);
      setDetailTab("ticket");
      if (ticketId) await loadTicketDetail(String(ticketId));
      await load();
      if (linkedCallbackId) await refreshSelected();
      setViewTickets(true);
    } catch (err: any) {
      setActionStatus(err?.message || "Failed to raise ticket");
    } finally {
      setRaisingTicket(false);
    }
  };

  const changeTicketStatus = async (status: string) => {
    const ticketId = ticketDetail?.ticket?._id || selected?.ticketId;
    if (!ticketId) return;
    setActionStatus("Updating ticket status…");
    try {
      const r = await supportApi.adminUpdateTicketStatus(String(ticketId), status, { notifyEmail, notifySms });
      await loadTicketDetail(String(ticketId));
      const notes: string[] = ["Ticket status updated."];
      if (r.notifications?.email) notes.push(`Email: ${r.notifications.email}`);
      if (r.notifications?.sms) notes.push(`SMS: ${r.notifications.sms}`);
      setActionStatus(notes.join(" "));
    } catch (e: any) {
      setActionStatus(e?.message || "Ticket update failed");
    }
  };

  const sendCustomerEmail = async () => {
    if (!selected) return;
    if (!selected.ticketId && !selected.callerEmail?.trim()) {
      setActionStatus("No email address on this callback request.");
      return;
    }
    setActionStatus("Sending email…");
    try {
      const payload: Record<string, string> = { templateId: emailTemplateId, body: emailPreview };
      if (selected.ticketId) payload.ticketId = String(selected.ticketId);
      else payload.callbackId = String(selected._id);
      const r = await supportApi.adminSendEmail(payload);
      setActionStatus(r.message || "Email sent");
      if (selected.ticketId) await loadTicketDetail(String(selected.ticketId));
      else await refreshSelected();
    } catch (e: any) {
      setActionStatus(e?.message || "Email failed");
    }
  };

  const sendCustomerSms = async () => {
    if (!selected) return;
    if (!selected.phone?.trim()) { setActionStatus("No phone number on this callback request."); return; }
    setActionStatus("Sending SMS…");
    try {
      const payload: Record<string, string> = { templateId: smsTemplateId, message: smsPreview };
      if (selected.ticketId) payload.ticketId = String(selected.ticketId);
      else payload.callbackId = String(selected._id);
      const r = await supportApi.adminSendSms(payload);
      setActionStatus(r.message || "SMS sent");
      if (selected.ticketId) await loadTicketDetail(String(selected.ticketId));
      else await refreshSelected();
    } catch (e: any) {
      setActionStatus(e?.message || "SMS failed");
    }
  };

  const filtered = statusFilter === "ALL" ? callbacks : callbacks.filter((c) => {
    if (statusFilter === "RESOLVED") return c.status === "RESOLVED" || c.status === "COMPLETED";
    return c.status === statusFilter;
  });

  const openCustomerTicket = async (t: any) => {
    try {
      const d = await supportApi.adminTicketDetail(String(t._id));
      setTicketDetail(d);
      if (String(t._id) === String(selected?.ticketId)) setDetailTab("ticket");
    } catch {
      setTicketDetail(null);
    }
  };

  const linkedTicket = Boolean(selected?.ticketId && ticketDetail?.ticket && String(ticketDetail.ticket._id) === String(selected.ticketId));

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: callbacks.length };
    for (const s of CALLBACK_STATUSES) {
      counts[s.id] = callbacks.filter((c) => {
        if (s.id === "RESOLVED") return c.status === "RESOLVED" || c.status === "COMPLETED";
        return c.status === s.id;
      }).length;
    }
    return counts;
  }, [callbacks]);

  const totalPending = statusCounts.PENDING || 0;

  const searchedCallbacks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return filtered;
    return filtered.filter((c) =>
      (c.callerName || "").toLowerCase().includes(q) ||
      (c.phone || "").includes(q) ||
      (c.callerEmail || "").toLowerCase().includes(q),
    );
  }, [filtered, searchQuery]);

  const stats = useMemo(() => buildCallStats(callbacks, callTickets), [callbacks, callTickets]);
  const softphoneConfigured = Boolean(callConfig?.softphoneConfigured);
  const useSoftphone = softphoneConfigured && !usePhoneFallback;
  const callInProgress = calling || softphoneState === "connecting" || softphoneState === "ringing" || softphoneState === "live";
  const callStatusWebhook = callConfig?.callStatusWebhookUrl ? `${callConfig.callStatusWebhookUrl}?callbackId={callbackId}` : null;
  const statusEntries = Object.entries(stats.byStatus).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const statusTotal = statusEntries.reduce((s, [, n]) => s + n, 0);
  const agentOnlineForNav = adminOnline && (useSoftphone ? ["ready", "live", "ringing", "connecting"].includes(softphoneState) : true);
  const activeCallerLabel = selected
    ? [selected.callerName, selected.phone].filter(Boolean).join(" · ")
    : "";

  if (viewTickets) {
    return (
      <div className="hs-call-tickets-view">
        <div className="hs-call-tickets-view__bar">
          <div>
            <h2>Call tickets</h2>
            <p>Tickets created from Call Management — accept, view, and follow up like other support tickets.</p>
          </div>
          <button type="button" className="hs-btn hs-btn--ghost" onClick={() => setViewTickets(false)}>
            ← Back to call dashboard
          </button>
        </div>
        <SubmissionTicketsModule variant="call" agentUser={agentUser} />
      </div>
    );
  }

  return (
    <div className="hs-call-mgmt">
      <CallManagementNav
        agentOnline={agentOnlineForNav}
        queuedCount={totalPending}
        callTicketsOpen={stats.callTicketsOpen}
        onRefresh={() => void load()}
        onViewTickets={() => setViewTickets(true)}
        onRaiseTicket={handleNavRaiseTicket}
        raiseTicketOpen={showRaiseTicket}
        refreshing={loading}
      />

      <div id="hs-call-log-ticket" className="hs-call-mgmt__raise-bar">
        {actionStatus ? <p className="hs-call-mgmt__action-status" role="status">{actionStatus}</p> : null}
      </div>

      <div className="hs-call-mgmt__layout">
        <aside id="hs-call-softphone" className="hs-call-mgmt__softphone">
          <div className="hs-call-mgmt__softphone-stack">
            <AgentSoftphonePanel
              online={adminOnline}
              onOnlineChange={setAdminOnline}
              softphoneConfigured={softphoneConfigured}
              usePhoneFallback={usePhoneFallback}
              onUsePhoneFallbackChange={setUsePhoneFallback}
              adminPhone={adminPhone}
              onAdminPhoneChange={setAdminPhone}
              softphoneRef={softphoneRef}
              softphoneState={softphoneState}
              onSoftphoneStatus={setActionStatus}
              onSoftphoneStateChange={setSoftphoneState}
              onCallEnded={onSoftphoneCallEnded}
              activeCallerLabel={activeCallerLabel}
              errorMessage={softphoneState === "error" ? actionStatus : ""}
              showAdvanced={showCallSetup}
              onToggleAdvanced={() => setShowCallSetup((v) => !v)}
              callStatusWebhook={callStatusWebhook}
            />
            <CallCustomerBackPanel
              onCallBack={handleManualCallBack}
              agentOnline={agentOnlineForNav}
              callBackLoadingId={callBackLoadingId}
            />
          </div>
        </aside>

        <div className="hs-call-mgmt__main">
          <div className="hs-analytics hs-call-dashboard">
            <div className="hs-call-dashboard__shell">
              <section id="hs-call-queue" className="hs-call-dashboard__callback-queue hs-call-dashboard__callback-queue--first" aria-labelledby="callback-queue-heading">
                <div className="hs-call-dashboard__recent-head">
                  <div>
                    <h3 id="callback-queue-heading">
                      <IconListOrdered size={20} className="hs-call-dashboard__recent-head-icon" />
                      Call requests
                      {totalPending > 0 && <span className="hs-callback-queue__badge">{totalPending} pending</span>}
                    </h3>
                    <p className="hs-call-dashboard__recent-sub">
                      Users who submitted <strong>name + phone</strong> on Help &amp; Support → Request call.
                      {agentOnlineForNav
                        ? " You are online — call back or update status from the dropdown."
                        : " Go online on the softphone above to call back."}
                      {stats.dialingCallbacks > 0 ? ` · ${stats.dialingCallbacks} in progress` : ""}
                    </p>
                  </div>
                </div>

                {!agentOnlineForNav && totalPending > 0 && (
                  <div className="hs-callback-queue__alert">
                    <IconAlertCircle size={18} />
                    <span>
                      Softphone is offline. Click <strong>Go online</strong> on the agent softphone, then call users back from this queue.
                    </span>
                  </div>
                )}

                <div className="admin-call-filters admin-call-filters--inline" style={{ marginBottom: "0.75rem" }}>
                  {["ALL", ...CALLBACK_STATUSES.map((s) => s.id)].map((s) => (
                    <button key={s} type="button" className={`admin-filter-chip ${statusFilter === s ? "active" : ""}`} onClick={() => setStatusFilter(s)}>
                      {s === "ALL" ? "All" : callbackStatusLabel(s)}
                      <span className="admin-filter-count">{statusCounts[s] ?? 0}</span>
                    </button>
                  ))}
                </div>
                <input type="search" className="admin-search-input" placeholder="Search name, phone, or email…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ marginBottom: "0.75rem", width: "100%" }} />
                {loading ? <p className="sx-help-muted">Loading…</p> : searchedCallbacks.length === 0 ? (
                  <div className="hs-call-dashboard__empty hs-callback-queue__empty">
                    No call requests yet. When a user submits name and phone on Help → Request call, they appear here.
                  </div>
                ) : (
                  <div className="hs-table-wrap hs-call-dashboard__table-wrap">
                    <table className="hs-table hs-call-dashboard__table hs-callback-queue__table">
                      <colgroup>
                        <col className="hs-callback-col-when" />
                        <col className="hs-callback-col-name" />
                        <col className="hs-callback-col-phone" />
                        <col className="hs-callback-col-status" />
                        <col className="hs-callback-col-actions" />
                      </colgroup>
                      <thead>
                        <tr>{["Requested", "Name", "Phone", "Status", "Actions"].map((h) => <th key={h}>{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {searchedCallbacks.map((c) => (
                          <CallbackQueueRow
                            key={String(c._id)}
                            item={{
                              id: String(c._id),
                              requestedAt: c.createdAt,
                              callerName: c.callerName,
                              callerEmail: c.callerEmail,
                              phone: c.phone,
                              status: c.status,
                            }}
                            selected={selected ? String(selected._id) === String(c._id) : false}
                            agentOnline={agentOnlineForNav}
                            callBackLoadingId={callBackLoadingId}
                            onSelect={selectQueueRow}
                            onQueueDial={(id) => void handleQueueDial(id)}
                            onRaiseTicket={openRaiseTicketForCallback}
                            onUpdate={handleCallbackUpdate}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section id="hs-call-tickets" className="hs-call-dashboard__tickets-cta" aria-labelledby="call-tickets-cta-heading">
                <div className="hs-call-dashboard__tickets-cta-main">
                  <div className="hs-call-dashboard__tickets-cta-icon" aria-hidden><IconTicket size={22} /></div>
                  <div>
                    <h3 id="call-tickets-cta-heading">Call tickets</h3>
                    <p className="hs-call-dashboard__tickets-cta-sub">
                      {stats.callTicketsOpen > 0 ? `${stats.callTicketsOpen} open ticket${stats.callTicketsOpen === 1 ? "" : "s"} need attention` : "All call tickets are up to date"}
                      {stats.callTicketsTotal > 0 && ` · ${stats.callTicketsTotal} total`}
                    </p>
                  </div>
                </div>
                <button type="button" className="hs-btn hs-btn--primary hs-view-tickets-btn" onClick={() => setViewTickets(true)}>
                  <IconTicket size={16} aria-hidden />
                  View tickets
                </button>
              </section>

              <section id="hs-call-metrics" className="hs-call-dashboard__section hs-call-metrics" aria-labelledby="call-metrics-heading">
                <header className="hs-call-metrics__header">
                  <div className="hs-call-metrics__header-main">
                    <div className="hs-call-metrics__header-icon" aria-hidden><IconChart size={20} /></div>
                    <div>
                      <h3 id="call-metrics-heading" className="hs-call-dashboard__section-title">Call metrics</h3>
                      <p className="hs-call-dashboard__section-sub">Volume, answer rate, and live queue at a glance</p>
                    </div>
                  </div>
                </header>
                <div className="hs-call-metrics__primary" role="group" aria-label="Call volume">
                  <CallMetricPrimary label="Incoming" value={stats.incomingCalls} tone="primary" />
                  <CallMetricPrimary label="Outgoing" value={stats.outgoingCalls} tone="indigo" />
                  <CallMetricPrimary label="Answered" value={stats.receivedCalls} tone="success" />
                  <CallMetricPrimary label="Missed" value={stats.missedCalls} tone="danger" />
                </div>
                <div className="hs-call-metrics__live" role="group" aria-label="Live indicators">
                  <CallMetricLive label="Answer rate" value={`${stats.answerRate}%`} hint={`${stats.receivedCalls} of ${stats.incomingCalls} answered`} tone={stats.answerRate >= 70 ? "success" : stats.answerRate >= 40 ? "warning" : "danger"} alert={stats.incomingCalls > 0 && stats.answerRate < 40} />
                  <CallMetricLive label="Active now" value={stats.activeCalls} hint={stats.activeCalls > 0 ? "Ringing or in progress" : "No active calls"} tone="warning" alert={stats.activeCalls > 0} />
                  <CallMetricLive label="Callback queue" value={stats.queuedCallbacks} hint={stats.dialingCallbacks > 0 ? `${stats.dialingCallbacks} dialing now` : "Waiting for call back"} tone="violet" alert={stats.queuedCallbacks > 0} />
                </div>
                <div className="hs-call-metrics__body">
                  <section className="hs-call-metrics__facts" aria-label="Additional call statistics">
                    <h4 className="hs-call-metrics__facts-title">Details</h4>
                    <dl className="hs-call-metrics__facts-list">
                      <CallMetricFact label="Today" value={`${stats.todayCalls} (${stats.todayIncoming} in · ${stats.todayOutgoing} out)`} />
                      <CallMetricFact label="Total calls" value={stats.totalCalls} />
                      <CallMetricFact label="Avg duration" value="—" />
                      <CallMetricFact label="Recorded" value={stats.withRecording} />
                      <CallMetricFact label="Tickets linked" value={stats.ticketsCreated} />
                    </dl>
                  </section>
                  <section className="hs-call-metrics__status" aria-labelledby="calls-by-status-heading">
                    <div className="hs-call-dashboard__status-panel-head">
                      <h3 id="calls-by-status-heading">Calls by status</h3>
                      {statusTotal > 0 && <span className="hs-call-dashboard__status-total">{statusTotal} total</span>}
                    </div>
                    {statusEntries.length === 0 ? (
                      <p className="hs-call-dashboard__status-empty">No status data yet.</p>
                    ) : (
                      <ul className="hs-call-dashboard__status-list hs-call-metrics__status-list">
                        {statusEntries.slice(0, 6).map(([status, count]) => {
                          const pct = statusTotal > 0 ? Math.round((count / statusTotal) * 100) : 0;
                          return (
                            <li key={status} className="hs-call-status-row">
                              <div className="hs-call-status-row__head">
                                <span className={callStatusClass(status)}>{callStatusLabel(status)}</span>
                                <span className="hs-call-status-row__count">
                                  <strong>{count}</strong>
                                  <span className="hs-call-status-row__pct">{pct}%</span>
                                </span>
                              </div>
                              <div className="hs-call-status-bar" role="presentation">
                                <div className={callStatusBarClass(status)} style={{ width: `${Math.max(pct, 4)}%` }} />
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      {selected ? (
        <CallbackDetailSheet
          selected={selected}
          ticketDetail={ticketDetail}
          customerHistory={customerHistory}
          detailTab={detailTab}
          setDetailTab={setDetailTab}
          linkedTicket={linkedTicket}
          adminOnline={adminOnline}
          useSoftphone={useSoftphone}
          softphoneState={softphoneState}
          callInProgress={callInProgress}
          actionStatus={actionStatus}
          emailTemplateId={emailTemplateId}
          setEmailTemplateId={setEmailTemplateId}
          smsTemplateId={smsTemplateId}
          setSmsTemplateId={setSmsTemplateId}
          emailPreview={emailPreview}
          setEmailPreview={setEmailPreview}
          smsPreview={smsPreview}
          setSmsPreview={setSmsPreview}
          notifyEmail={notifyEmail}
          setNotifyEmail={setNotifyEmail}
          notifySms={notifySms}
          setNotifySms={setNotifySms}
          onClose={() => {
            raiseTicketGuardUntil.current = Date.now() + 600;
            setShowRaiseTicket(false);
            setRaiseCallbackId(null);
            setSelected(null);
            setTicketDetail(null);
            setActionStatus("");
          }}
          onUpdateCallbackStatus={(s) => void updateCallbackStatus(s)}
          onInitiateCall={() => void initiateCall()}
          onOpenCallCreateTicket={openCallCreateTicket}
          onSelectCallback={(c) => void selectCallback(c)}
          onOpenCustomerTicket={(t) => void openCustomerTicket(t)}
          onSendCustomerEmail={() => void sendCustomerEmail()}
          onSendCustomerSms={() => void sendCustomerSms()}
          onChangeTicketStatus={(s) => void changeTicketStatus(s)}
        />
      ) : null}

      {showRaiseTicket ? (
        <div
          className="sx-help-modal-backdrop hs-call-raise-ticket-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="hs-raise-ticket-title"
          onMouseDown={(e) => {
            // Click outside the form closes — and blocks click-through.
            if (e.target === e.currentTarget) {
              e.preventDefault();
              e.stopPropagation();
              closeRaiseTicket();
            }
          }}
        >
          <form
            className="sx-help-modal sx-help-email-form hs-call-raise-ticket-form"
            onSubmit={submitRaiseTicket}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="hs-call-raise-ticket-form__head">
              <h3 id="hs-raise-ticket-title">Create support ticket</h3>
              <button
                type="button"
                className="hs-call-raise-ticket-form__close"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  closeRaiseTicket();
                }}
                aria-label="Close create ticket"
                disabled={raisingTicket}
              >
                ×
              </button>
            </div>
            <div className="hs-call-raise-ticket-form__scroll">
              <p className="admin-hint">
                {raiseCallbackId
                  ? "Prefilled from the selected call request. Submit to create a new call ticket."
                  : "Enter customer name, phone, email, subject, and description to create a call ticket."}
              </p>
              <label className="hs-call-raise-ticket-form__label">
                Customer email
                <input
                  required
                  type="email"
                  placeholder="customer@example.com"
                  value={raiseForm.email}
                  onChange={(e) => setRaiseForm((f) => ({ ...f, email: e.target.value }))}
                />
              </label>
              <label className="hs-call-raise-ticket-form__label">
                Customer name
                <input
                  required
                  placeholder="Full name"
                  value={raiseForm.name}
                  onChange={(e) => setRaiseForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>
              <label className="hs-call-raise-ticket-form__label">
                Customer phone
                <input
                  required
                  type="tel"
                  placeholder="+91…"
                  value={raiseForm.phone}
                  onChange={(e) => setRaiseForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </label>
              <label className="hs-call-raise-ticket-form__label">
                Subject
                <input
                  required
                  placeholder="Ticket subject"
                  value={raiseForm.subject}
                  onChange={(e) => setRaiseForm((f) => ({ ...f, subject: e.target.value }))}
                />
              </label>
              <label className="hs-call-raise-ticket-form__label">
                Category
                <select value={raiseForm.category} onChange={(e) => setRaiseForm((f) => ({ ...f, category: e.target.value }))}>
                  {["Call", "General", "Account & Login", "Technical Support"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="hs-call-raise-ticket-form__label">
                Description / call notes
                <textarea
                  required
                  placeholder="What was discussed and what follow-up is needed…"
                  rows={4}
                  value={raiseForm.description}
                  onChange={(e) => setRaiseForm((f) => ({ ...f, description: e.target.value }))}
                />
              </label>
            </div>
            <div className="sx-help-modal-actions hs-call-raise-ticket-form__actions">
              <button type="submit" className="primary" disabled={raisingTicket}>
                {raisingTicket ? "Creating…" : "Create ticket"}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  closeRaiseTicket();
                }}
                disabled={raisingTicket}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
