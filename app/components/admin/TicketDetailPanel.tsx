"use client";

import { useEffect, useId, useRef, useState } from "react";
import { channelLabel, statusColor, statusLabel, TICKET_STATUSES } from "@/lib/ticketConstants";
import {
  SUPPORT_EMAIL_TEMPLATES,
  SUPPORT_SMS_TEMPLATES,
  renderTemplate,
  buildTemplateVars,
} from "@/lib/supportTemplates";
import { ClientDateTime } from "./ClientDateTime";
import { TechnicalEscalationPanel } from "./TechnicalEscalationPanel";
import {
  IconCalendar,
  IconCheckCircle,
  IconChevronDown,
  IconChevronUp,
  IconFolder,
  IconHistory,
  IconMail,
  IconMessage,
  IconPhone,
  IconRefresh,
  IconSend,
  IconSendPlane,
  IconSparkle,
  IconTag,
  IconUser,
  IconUserCheck,
  IconWrench,
  IconX,
} from "./AdminIcons";
import "./ticket-detail.css";
import "./escalated-tickets.css";

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
  onAssigned?: (data: any) => void;
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
  onAssigned,
}: Props) {
  const [activeTab, setActiveTab] = useState("overview");
  const prevId = useRef<string | null>(null);
  const fieldIdPrefix = useId().replace(/:/g, "");
  const [emailTemplateId, setEmailTemplateId] = useState(SUPPORT_EMAIL_TEMPLATES[0]?.id || "");
  const [smsTemplateId, setSmsTemplateId] = useState(SUPPORT_SMS_TEMPLATES[0]?.id || "");
  const [emailPreview, setEmailPreview] = useState("");
  const [smsPreview, setSmsPreview] = useState("");
  const [smsPhone, setSmsPhone] = useState("");
  const [emailOpen, setEmailOpen] = useState(true);
  const [smsOpen, setSmsOpen] = useState(true);

  const t = detail?.ticket || ticket;
  const id = String(t?._id || t?.id || "");

  useEffect(() => {
    if (id !== prevId.current) {
      setActiveTab("overview");
      setSmsPhone(ticketUserPhone(t) || "");
      setEmailOpen(true);
      setSmsOpen(true);
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
  const smsTemplateFieldId = `${fieldIdPrefix}-sms-template`;
  const smsPhoneFieldId = `${fieldIdPrefix}-sms-phone`;
  const smsMessageFieldId = `${fieldIdPrefix}-sms-message`;
  const canSendSms = Boolean(smsPreview.trim() && smsPhone.trim());
  const customerEmail = ticketUserEmail(t);
  const hasEmail = Boolean(customerEmail && !customerEmail.includes("@guest."));

  const tabs = [
    { key: "overview", icon: IconFolder, label: "Overview" },
    { key: "status", icon: IconRefresh, label: "Status", badge: statusLabel(t.status) },
    { key: "technical", icon: IconWrench, label: "Assign team" },
    { key: "contact", icon: IconSendPlane, label: "Contact" },
    { key: "history", icon: IconHistory, label: "History", badge: detail?.messages?.length ? String(detail.messages.length) : null },
  ];

  const handleResolve = () => {
    if (!canUpdateStatus || isClosed) return;
    onStatusChange("RESOLVED");
  };

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
            <button type="button" className="tdp__accept-btn tdp__accept-btn--hero" disabled={accepting} onClick={onAccept}>
              <IconUserCheck size={18} />
              {accepting ? "Accepting…" : "Accept ticket"}
            </button>
          ) : null}
          <button type="button" className="tdp__header-close" onClick={onClose} aria-label="Close">
            <IconX size={16} />
            <span>Close</span>
          </button>
        </div>
      </header>

      {needsAccept ? (
        <div className="tdp__accept-strip" role="status">
          <div className="tdp__accept-strip__text">
            <IconUserCheck size={20} />
            <div>
              <strong>This ticket is unassigned</strong>
              <p>Accept it to update status, contact the customer, or assign the technical team.</p>
            </div>
          </div>
          <button type="button" className="tdp__accept-btn tdp__accept-btn--hero" disabled={accepting} onClick={onAccept}>
            <IconUserCheck size={18} />
            {accepting ? "Accepting…" : "Accept ticket"}
          </button>
        </div>
      ) : null}

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
                <button type="button" className="tdp__accept-btn tdp__accept-btn--hero" disabled={accepting} onClick={onAccept}>
                  {accepting ? "Accepting…" : "Accept ticket"}
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
            {needsAccept ? (
              <div className="tdp__assign-banner tdp__assign-banner--accept">
                <IconUserCheck size={16} />
                <div>
                  <strong>Accept this ticket before assigning to the technical team.</strong>
                  <p>Click Accept to claim this ticket, then pick a specialist below.</p>
                </div>
                <button type="button" className="tdp__accept-btn tdp__accept-btn--hero" disabled={accepting} onClick={onAccept}>
                  {accepting ? "Accepting…" : "Accept ticket"}
                </button>
              </div>
            ) : null}
            {!canUpdateStatus && !needsAccept ? (
              <div className="tdp__assign-banner tdp__assign-banner--locked">
                <IconWrench size={16} />
                <div>
                  <strong>Assigned to {agentName || "another agent"}</strong>
                  <p>Only the assigned agent can escalate this ticket to the technical team.</p>
                </div>
              </div>
            ) : null}
            <TechnicalEscalationPanel
              ticket={detail?.ticket || t}
              locked={needsAccept || !canUpdateStatus}
              lockedReason={
                needsAccept
                  ? "Accept this ticket before assigning to the technical team."
                  : "Only the assigned agent can escalate this ticket."
              }
              onAssigned={onAssigned}
            />
            {actionStatus ? <p className="admin-action-status">{actionStatus}</p> : null}
          </div>
        )}

        {activeTab === "contact" && (
          <div className="tdp__tab-section tdp__tab-section--contact" role="tabpanel" id={`${fieldIdPrefix}-panel-contact`} aria-labelledby={`${fieldIdPrefix}-tab-contact`}>
            <div className="tdp__contact-row">
              <div className={`hs-email-composer${emailOpen ? " is-expanded" : ""}`}>
                <button
                  type="button"
                  className={`hs-composer-card hs-composer-card--email${emailOpen ? " is-open" : ""}${!hasEmail ? " is-disabled" : ""}`}
                  onClick={() => hasEmail && setEmailOpen((v) => !v)}
                  disabled={!hasEmail}
                  title={hasEmail ? "Send email to customer" : "No customer email on this ticket"}
                >
                  <span className="hs-composer-card__icon" aria-hidden>
                    <IconMail size={22} />
                  </span>
                  <span className="hs-composer-card__body">
                    <span className="hs-composer-card__title">Send email to customer</span>
                    <span className="hs-composer-card__sub">{hasEmail ? customerEmail : "No email available"}</span>
                  </span>
                  <span className="hs-composer-card__arrow" aria-hidden>
                    {emailOpen ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
                  </span>
                </button>

                {!hasEmail ? (
                  <p className="hs-detail-note">Customer email is not available for this ticket.</p>
                ) : null}

                {emailOpen && hasEmail ? (
                  <div className="hs-email-form">
                    <p className="hs-email-form__intro">
                      Choose a predefined template or write your own message. Sent via Brevo to the customer inbox.
                    </p>
                    <label className="hs-email-form__label" htmlFor={emailTemplateFieldId}>Predefined template</label>
                    <select
                      id={emailTemplateFieldId}
                      className="hs-email-form__select"
                      value={emailTemplateId}
                      onChange={(e) => setEmailTemplateId(e.target.value)}
                    >
                      {SUPPORT_EMAIL_TEMPLATES.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>{tpl.label}</option>
                      ))}
                    </select>
                    <label className="hs-email-form__label" htmlFor={emailMessageFieldId}>Message</label>
                    <textarea
                      id={emailMessageFieldId}
                      className="hs-email-form__textarea"
                      rows={8}
                      value={emailPreview}
                      onChange={(e) => setEmailPreview(e.target.value)}
                      placeholder="Write your message to the customer…"
                    />
                    <div className="hs-email-form__actions">
                      <button type="button" className="hs-btn" onClick={() => setEmailOpen(false)}>
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="hs-btn hs-btn--primary"
                        onClick={() => onSendEmail(emailPreview, emailTemplateId)}
                        disabled={!emailPreview.trim()}
                      >
                        <IconSend size={16} />
                        Send email
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className={`hs-sms-composer${smsOpen ? " is-expanded" : ""}`}>
                <button
                  type="button"
                  className={`hs-composer-card hs-composer-card--sms${smsOpen ? " is-open" : ""}`}
                  onClick={() => setSmsOpen((v) => !v)}
                  title="Send SMS to customer via Twilio"
                >
                  <span className="hs-composer-card__icon" aria-hidden>
                    <IconMessage size={22} />
                  </span>
                  <span className="hs-composer-card__body">
                    <span className="hs-composer-card__title">Send SMS to customer</span>
                    <span className="hs-composer-card__sub">
                      {smsPhone.trim() ? smsPhone.trim() : "via Twilio · add phone to send"}
                    </span>
                  </span>
                  <span className="hs-composer-card__arrow" aria-hidden>
                    {smsOpen ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
                  </span>
                </button>

                {smsOpen ? (
                  <div className="hs-email-form hs-sms-form">
                    <p className="hs-email-form__intro">
                      Send a short text from your support desk number. Prefer predefined templates for common updates.
                    </p>
                    <label className="hs-email-form__label" htmlFor={smsPhoneFieldId}>Customer phone</label>
                    <div className="hs-email-form__phone-row">
                      <IconPhone size={16} />
                      <input
                        id={smsPhoneFieldId}
                        type="tel"
                        className={`hs-email-form__input${smsPhone.trim() ? "" : " hs-email-form__input--missing"}`}
                        value={smsPhone}
                        onChange={(e) => setSmsPhone(e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                        autoComplete="tel"
                      />
                    </div>
                    <label className="hs-email-form__label" htmlFor={smsTemplateFieldId}>Predefined template</label>
                    <select
                      id={smsTemplateFieldId}
                      className="hs-email-form__select"
                      value={smsTemplateId}
                      onChange={(e) => setSmsTemplateId(e.target.value)}
                    >
                      {SUPPORT_SMS_TEMPLATES.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>{tpl.label}</option>
                      ))}
                    </select>
                    <label className="hs-email-form__label" htmlFor={smsMessageFieldId}>
                      SMS message
                      <span className={`hs-sms-char-count${smsPreview.length > 320 ? " is-over" : ""}`}>
                        {smsPreview.length}/320
                      </span>
                    </label>
                    <textarea
                      id={smsMessageFieldId}
                      className="hs-email-form__textarea hs-sms-form__textarea"
                      rows={4}
                      maxLength={320}
                      value={smsPreview}
                      onChange={(e) => setSmsPreview(e.target.value)}
                      placeholder="Choose a template or type your SMS…"
                    />
                    <div className="hs-email-form__actions">
                      <button type="button" className="hs-btn" onClick={() => setSmsOpen(false)}>
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="hs-btn hs-btn--sms-submit"
                        onClick={() => onSendSms(smsPreview, smsTemplateId, smsPhone.trim() || undefined)}
                        disabled={!canSendSms}
                      >
                        <IconSend size={16} />
                        Send SMS
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
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
