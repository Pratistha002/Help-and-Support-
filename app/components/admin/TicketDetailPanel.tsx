"use client";

import { useEffect, useId, useRef, useState } from "react";
import { channelLabel, statusColor, statusLabel, TICKET_STATUSES } from "@/lib/ticketConstants";
import {
  SUPPORT_EMAIL_TEMPLATES,
  SUPPORT_SMS_TEMPLATES,
  renderTemplate,
  buildTemplateVars,
} from "@/lib/supportTemplates";
import { ClientDateTime } from "./ClientDateTime";import {
  IconCalendar,
  IconCheckCircle,
  IconFolder,
  IconHistory,
  IconMail,
  IconMessage,
  IconRefresh,
  IconSendPlane,
  IconSparkle,
  IconTag,
  IconUser,
  IconUserCheck,
  IconWrench,
  IconX,
} from "./AdminIcons";
import "./ticket-detail.css";

function customerInitials(name?: string): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function priorityTone(priority?: string): string {
  if (!priority) return "none";
  const p = priority.toUpperCase();
  if (p === "URGENT") return "urgent";
  if (p === "HIGH") return "high";
  if (p === "MEDIUM") return "medium";
  return "low";
}

function StatusBadge({ status }: { status: string }) {
  const color = statusColor(status);
  return (
    <span className="hs-status-badge" style={{ color, background: `${color}18`, borderColor: `${color}40` }}>
      {statusLabel(status)}
    </span>
  );
}

function PriorityBadge({ priority }: { priority?: string }) {
  if (!priority) return <span className="hs-sub-priority hs-sub-priority--none">—</span>;
  return (
    <span className={`hs-sub-priority hs-sub-priority--${priorityTone(priority)}`}>
      {priority}
    </span>
  );
}

type AgentUser = { id: string; email: string; fullName: string } | null;

type Props = {
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
};

function ticketUserName(t: any) {
  return t?.name || t?.userName || "—";
}

function ticketUserEmail(t: any) {
  return t?.email || t?.userEmail || "";
}

function ticketUserPhone(t: any) {
  return t?.phone || t?.userPhone;
}

function ticketAgentName(t: any) {
  return t?.assignedAdminName || t?.assignedAgentName;
}

function ticketAgentEmail(t: any) {
  return t?.assignedAdminEmail || t?.assignedAgentEmail;
}

function ticketNeedsAccept(ticket: any) {
  return !ticket?.assignedAdminId && !ticket?.assignedAgentId
    && !ticket?.assignedAdminEmail && !ticket?.assignedAgentEmail;
}

type SmsComposerProps = {
  idPrefix: string;
  smsTemplateId: string;
  onTemplateChange: (id: string) => void;
  smsPreview: string;
  onPreviewChange: (value: string) => void;
  smsPhone: string;
  onPhoneChange: (value: string) => void;
  onSend: () => void;
};

function SmsComposer({
  idPrefix,
  smsTemplateId,
  onTemplateChange,
  smsPreview,
  onPreviewChange,
  smsPhone,
  onPhoneChange,
  onSend,
}: SmsComposerProps) {
  const canSend = Boolean(smsPreview.trim() && smsPhone.trim());
  const templateId = `${idPrefix}-sms-template`;
  const phoneId = `${idPrefix}-sms-phone`;
  const messageId = `${idPrefix}-sms-message`;

  return (
    <div className="admin-composer admin-sms-composer hs-sms-composer">
      <h4>Send SMS</h4>
      <label htmlFor={templateId}>Template</label>
      <select id={templateId} value={smsTemplateId} onChange={(e) => onTemplateChange(e.target.value)}>
        {SUPPORT_SMS_TEMPLATES.map((tpl) => (
          <option key={tpl.id} value={tpl.id}>{tpl.label}</option>
        ))}
      </select>
      <label htmlFor={phoneId}>Phone number</label>
      <input
        id={phoneId}
        type="tel"
        value={smsPhone}
        onChange={(e) => onPhoneChange(e.target.value)}
        placeholder="e.g. +91 98765 43210"
        autoComplete="tel"
      />
      <label htmlFor={messageId}>Message</label>
      <textarea
        id={messageId}
        rows={4}
        value={smsPreview}
        onChange={(e) => onPreviewChange(e.target.value)}
        maxLength={320}
        placeholder="Choose a template or type your message…"
      />
      <button type="button" className="admin-btn-sm" onClick={onSend} disabled={!canSend}>
        {canSend ? `Send SMS to ${smsPhone.trim()}` : "Enter phone and message to send"}
      </button>
    </div>
  );
}

export function TicketDetailPanel({
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
  showEmailChannel = true,
}: Props) {
  const [activeTab, setActiveTab] = useState("overview");
  const prevId = useRef<string | null>(null);
  const fieldIdPrefix = useId().replace(/:/g, "");
  const [emailTemplateId, setEmailTemplateId] = useState(SUPPORT_EMAIL_TEMPLATES[0]?.id || "");
  const [smsTemplateId, setSmsTemplateId] = useState(SUPPORT_SMS_TEMPLATES[0]?.id || "");
  const [emailPreview, setEmailPreview] = useState("");
  const [smsPreview, setSmsPreview] = useState("");
  const [smsPhone, setSmsPhone] = useState("");

  const t = detail?.ticket || ticket;
  const id = String(t?._id || t?.id || "");

  useEffect(() => {
    if (id !== prevId.current) {
      setActiveTab("overview");
      setSmsPhone(ticketUserPhone(t) || "");
      prevId.current = id || null;
    }
  }, [id, t]);

  useEffect(() => {
    if (!t) return;
    const vars = buildTemplateVars(t);
    const emailTpl = SUPPORT_EMAIL_TEMPLATES.find((x) => x.id === emailTemplateId);
    const smsTpl = SUPPORT_SMS_TEMPLATES.find((x) => x.id === smsTemplateId);
    setEmailPreview(emailTpl ? renderTemplate(emailTpl.body, vars) : "");
    setSmsPreview(smsTpl ? renderTemplate(smsTpl.body, vars) : "");
  }, [t, emailTemplateId, smsTemplateId]);

  if (!t) return null;

  const needsAccept = ticketNeedsAccept(t);
  const isClosed = t.status === "CLOSED" || t.status === "RESOLVED";
  const channel = channelLabel(t.channel || t.sourceChannel || "EMAIL");
  const agentName = ticketAgentName(t);
  const agentEmail = ticketAgentEmail(t);
  const emailTemplateFieldId = `${fieldIdPrefix}-email-template`;
  const emailMessageFieldId = `${fieldIdPrefix}-email-message`;

  const tabs = [
    { key: "overview", icon: IconFolder, label: "Overview" },
    { key: "status", icon: IconRefresh, label: "Status", badge: statusLabel(t.status) },
    { key: "technical", icon: IconWrench, label: "Assign team" },
    { key: "sms", icon: IconMessage, label: "SMS" },
    { key: "contact", icon: IconSendPlane, label: "Contact" },
    { key: "history", icon: IconHistory, label: "History", badge: detail?.messages?.length ? String(detail.messages.length) : null },
  ];

  const handleResolve = () => {
    if (!canUpdateStatus || isClosed) return;
    onStatusChange("RESOLVED");
  };

  const handleSendSms = () => {
    onSendSms(smsPreview, smsTemplateId, smsPhone.trim() || undefined);
  };

  const renderSmsComposer = (suffix: string) => (
    <SmsComposer
      key={suffix}
      idPrefix={`${fieldIdPrefix}-${suffix}`}
      smsTemplateId={smsTemplateId}
      onTemplateChange={setSmsTemplateId}
      smsPreview={smsPreview}
      onPreviewChange={setSmsPreview}
      smsPhone={smsPhone}
      onPhoneChange={setSmsPhone}
      onSend={handleSendSms}
    />
  );

  return (
    <div className="tdp tdp--modal">
      <header className="tdp__header">
        <div className="tdp__header-brand">
          <span className="tdp__header-avatar" aria-hidden>{customerInitials(ticketUserName(t))}</span>
          <div className="tdp__header-text">
            <h2 id="tdm-title" className="tdp__header-name">{ticketUserName(t)}</h2>
            <p className="tdp__header-subject-line">{t.subject || "No subject provided"}</p>
            <p className="tdp__header-meta">
              {showEmailChannel ? <IconMail size={12} /> : null}
              <span>{channel}</span>
              {ticketUserEmail(t) ? (
                <>
                  <span aria-hidden>·</span>
                  <span>{ticketUserEmail(t)}</span>
                </>
              ) : null}
              {t.createdAt ? (
                <>
                  <span aria-hidden>·</span>
                  <IconCalendar size={12} />
                  <ClientDateTime value={t.createdAt} />
                </>
              ) : null}
            </p>
          </div>
        </div>
        <div className="tdp__header-actions">
          <div className="tdp__header-badges">
            <span className="tdp__header-id">{t.ticketNumber}</span>
            <StatusBadge status={t.status} />
            <PriorityBadge priority={t.priority} />
          </div>
          {agentName ? (
            <span className="tdp__assigned-chip tdp__assigned-chip--other">Agent: {agentName}</span>
          ) : null}
          {needsAccept ? (
            <button type="button" className="tdp__accept-btn" disabled={accepting} onClick={onAccept}>
              <IconUserCheck size={14} />
              {accepting ? "Accepting…" : "Accept ticket"}
            </button>
          ) : null}
          <button type="button" className="tdp__header-close" onClick={onClose} aria-label="Close">
            <IconX size={16} />
            <span>Close</span>
          </button>
        </div>
      </header>

      <nav className="tdp__nav" role="tablist" aria-label="Ticket detail tabs">
        {tabs.map(({ key, icon: Icon, label, badge }) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`${fieldIdPrefix}-tab-${key}`}
            aria-controls={`${fieldIdPrefix}-panel-${key}`}
            data-tab={key}
            className={`tdp__nav-btn${activeTab === key ? " is-active" : ""}`}
            onClick={() => setActiveTab(key)}
            aria-selected={activeTab === key}
          >
            <Icon size={15} />
            <span>{label}</span>
            {badge ? <span className="tdp__nav-badge">{badge}</span> : null}
          </button>
        ))}
      </nav>

      <div className="tdp__content">
        {activeTab === "overview" && (
          <div className="tdp__overview" role="tabpanel" id={`${fieldIdPrefix}-panel-overview`} aria-labelledby={`${fieldIdPrefix}-tab-overview`}>
            <div className="tdp__overview-layout">
              <div className="tdp__overview-main">
                <div className="tdp__msg">
                  <div className="tdp__msg-meta-row">
                    <IconMail size={13} />
                    <span>{channel}</span>
                    <span aria-hidden>·</span>
                    <ClientDateTime value={t.createdAt} />
                  </div>
                  <h4 className="tdp__msg-subject">{t.subject || "No subject provided"}</h4>
                  <div className="tdp__msg-body">
                    {t.description?.trim() ? t.description : <em className="tdp__msg-empty">No message content provided.</em>}
                  </div>
                </div>
              </div>
            </div>

            <div className="tdp__cards">
              <div className="tdp__card tdp__card--customer">
                <div className="tdp__card-head">
                  <span className="tdp__card-icon"><IconUser size={14} /></span>
                  <span>Customer</span>
                </div>
                <dl className="tdp__card-fields">
                  <dt>Name</dt><dd>{ticketUserName(t)}</dd>
                  {ticketUserEmail(t) && <><dt>Email</dt><dd><a href={`mailto:${ticketUserEmail(t)}`}>{ticketUserEmail(t)}</a></dd></>}
                  {ticketUserPhone(t) && <><dt>Phone</dt><dd><a href={`tel:${ticketUserPhone(t)}`} className="tdp__mono">{ticketUserPhone(t)}</a></dd></>}
                  {t.consumerType && <><dt>Type</dt><dd>{t.consumerType}</dd></>}
                </dl>
              </div>

              <div className="tdp__card tdp__card--ticket">
                <div className="tdp__card-head">
                  <span className="tdp__card-icon tdp__card-icon--ticket"><IconTag size={14} /></span>
                  <span>Ticket details</span>
                </div>
                <dl className="tdp__card-fields">
                  {t.category && <><dt>Category</dt><dd>{t.category}</dd></>}
                  <dt>Issue type</dt><dd>{t.issueTypeLabel || t.category || "—"}</dd>
                  <dt>Priority</dt><dd><PriorityBadge priority={t.priority} /></dd>
                  <dt>Status</dt><dd><StatusBadge status={t.status} /></dd>
                  {agentName && (
                    <>
                      <dt>Handling agent</dt>
                      <dd className="tdp__agent-name">
                        {agentName}
                        {agentEmail ? <span className="tdp__agent-email">{agentEmail}</span> : null}
                      </dd>
                    </>
                  )}
                  <dt>Created</dt><dd><ClientDateTime value={t.createdAt} /></dd>
                </dl>
              </div>
            </div>

            {t.description && t.description.length > 120 ? (
              <div className="tdp__ai">
                <IconSparkle size={15} />
                <div>
                  <strong>Issue summary</strong>
                  <p>{t.description.slice(0, 280)}{t.description.length > 280 ? "…" : ""}</p>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {activeTab === "status" && (
          <div className="tdp__tab-section" role="tabpanel" id={`${fieldIdPrefix}-panel-status`} aria-labelledby={`${fieldIdPrefix}-tab-status`}>
            <div className="tdp__tab-section-head">
              <h3>Change ticket status</h3>
              <p>Current status: <StatusBadge status={t.status} /></p>
            </div>
            {needsAccept ? (
              <div className="tdp__assign-banner tdp__assign-banner--accept">
                <IconUserCheck size={16} />
                <div>
                  <strong>Accept this ticket to update status</strong>
                  <p>Click Accept to assign this ticket to yourself before changing status.</p>
                </div>
                <button type="button" className="tdp__accept-btn" disabled={accepting} onClick={onAccept}>
                  {accepting ? "Accepting…" : "Accept"}
                </button>
              </div>
            ) : null}
            {!canUpdateStatus && !needsAccept ? (
              <div className="tdp__assign-banner tdp__assign-banner--locked">
                <div>
                  <strong>Assigned to {agentName || "another agent"}</strong>
                  <p>Only the assigned agent can update this ticket&apos;s status.</p>
                </div>
              </div>
            ) : null}
            {canUpdateStatus ? (
              <p className="tdp__status-note">Select a new status below. Optionally notify the customer by email or SMS.</p>
            ) : null}
            <div className="tdp__status-grid">
              {TICKET_STATUSES.map((s) => {
                const isActive = t.status === s.id;
                const locked = !canUpdateStatus;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`tdp__status-card${isActive ? " is-active" : ""}${locked ? " is-locked" : ""}`}
                    style={{ "--sc": s.color, "--sb": `${s.color}18`, "--sbd": `${s.color}40` } as React.CSSProperties}
                    disabled={isActive || locked}
                    onClick={() => !locked && onStatusChange(s.id)}
                  >
                    <span className="tdp__status-card__dot" />
                    <span className="tdp__status-card__label">{s.label}</span>
                    {isActive ? <span className="tdp__status-card__active-tag">Current</span> : null}
                  </button>
                );
              })}
            </div>
            <div className="admin-notify-options" style={{ marginTop: "1rem" }}>
              <label><input type="checkbox" checked={notifyEmail} onChange={(e) => onNotifyEmailChange(e.target.checked)} /> Email on status change</label>
              <label><input type="checkbox" checked={notifySms} onChange={(e) => onNotifySmsChange(e.target.checked)} disabled={!ticketUserPhone(t)} /> SMS on status change</label>
            </div>
            {actionStatus ? <p className="admin-action-status">{actionStatus}</p> : null}
          </div>
        )}

        {activeTab === "technical" && (
          <div className="tdp__tab-section" role="tabpanel" id={`${fieldIdPrefix}-panel-technical`} aria-labelledby={`${fieldIdPrefix}-tab-technical`}>
            <div className="tdp__tab-section-head">
              <h3>Assign team</h3>
              <p>Escalate tickets that need specialist attention.</p>
            </div>
            <div className="tdp__assign-banner tdp__assign-banner--locked">
              <IconWrench size={16} />
              <div>
                <strong>Escalation via status</strong>
                <div className="tdp__escalate-hint">
                  To escalate, go to the{" "}
                  <button type="button" className="tdp__warn-link" onClick={() => setActiveTab("status")}>Status</button>{" "}
                  tab and set the ticket to <strong>Escalated</strong>.
                  Then note the specialist in the ticket description or admin notes.
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "sms" && (
          <div className="tdp__tab-section" role="tabpanel" id={`${fieldIdPrefix}-panel-sms`} aria-labelledby={`${fieldIdPrefix}-tab-sms`}>
            {renderSmsComposer("sms-tab")}
            {actionStatus ? <p className="admin-action-status">{actionStatus}</p> : null}
          </div>
        )}

        {activeTab === "contact" && (
          <div className="tdp__tab-section tdp__tab-section--contact" role="tabpanel" id={`${fieldIdPrefix}-panel-contact`} aria-labelledby={`${fieldIdPrefix}-tab-contact`}>
            <div className="tdp__contact-row">
              <div className="admin-composer admin-email-composer hs-email-composer">
                <h4>Send email</h4>
                <label htmlFor={emailTemplateFieldId}>Template</label>
                <select id={emailTemplateFieldId} value={emailTemplateId} onChange={(e) => setEmailTemplateId(e.target.value)}>
                  {SUPPORT_EMAIL_TEMPLATES.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>{tpl.label}</option>
                  ))}
                </select>
                <label htmlFor={emailMessageFieldId}>Message</label>
                <textarea
                  id={emailMessageFieldId}
                  rows={8}
                  value={emailPreview}
                  onChange={(e) => setEmailPreview(e.target.value)}
                />
                <button type="button" className="admin-btn-sm" onClick={() => onSendEmail(emailPreview, emailTemplateId)} disabled={!emailPreview.trim()}>
                  Send email to {ticketUserEmail(t)}
                </button>
              </div>
              {renderSmsComposer("contact-tab")}
            </div>
            {actionStatus ? <p className="admin-action-status">{actionStatus}</p> : null}
          </div>
        )}

        {activeTab === "history" && (
          <div className="tdp__tab-section" role="tabpanel" id={`${fieldIdPrefix}-panel-history`} aria-labelledby={`${fieldIdPrefix}-tab-history`}>
            {detail?.messages?.length > 0 ? (
              <div className="admin-ticket-thread">
                {detail.messages.map((m: any, i: number) => (
                  <div key={i} className={`admin-thread-msg admin-thread-msg--${m.senderType?.toLowerCase()}`}>
                    <b>{m.senderName || m.senderType}:</b>
                    <pre className="admin-thread-pre">{m.content}</pre>
                  </div>
                ))}
              </div>
            ) : (
              <div className="admin-empty-state">
                <p><strong>No activity yet</strong></p>
                <p className="admin-hint">Emails, SMS, and status updates will appear here.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="tdp__footer">
        <div className="tdp__footer-inner">
          <div className="tdp__footer-info">
            <span className="tdp__footer-ticket">{t.ticketNumber}</span>
            <StatusBadge status={t.status} />
            <PriorityBadge priority={t.priority} />
          </div>
          <button
            type="button"
            className="tdp__resolve-btn"
            disabled={isClosed || !canUpdateStatus}
            onClick={handleResolve}
          >
            <IconCheckCircle size={16} />
            {t.status === "CLOSED" ? "Closed" : t.status === "RESOLVED" ? "Resolved" : "Mark resolved"}
          </button>
        </div>
      </div>
    </div>
  );
}
