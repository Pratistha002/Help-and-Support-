"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { appPath } from "@/lib/apiBase";
import { getAuthFromStorage, setAuthInStorage } from "@/lib/auth";
import { applyHelpAgentSsoFromUrl } from "@/lib/helpAgentSso";
import { supportApi } from "@/lib/supportApi";
import { groupByCustomer, customerKey, type CustomerGroup } from "@/lib/customerGroup";
import { TICKET_STATUSES, TICKET_CHANNELS, statusLabel, statusColor, channelLabel } from "@/lib/ticketConstants";
import { CALLBACK_STATUSES, callbackStatusLabel, callbackStatusColor, callbackReference } from "@/lib/callbackConstants";
import {
  SUPPORT_EMAIL_TEMPLATES,
  SUPPORT_SMS_TEMPLATES,
  renderTemplate,
  buildTemplateVars,
} from "@/lib/supportTemplates";
import { AdminLiveChatPanel } from "./AdminLiveChatPanel";
import { AdminHubDashboard } from "./AdminHubDashboard";
import { HelpSupportAnalyticsPage } from "./HelpSupportAnalyticsPage";
import { ManageEmailModule } from "./ManageEmailModule";
import { ManageFormModule } from "./ManageFormModule";
import { CallManagementModule } from "./CallManagementModule";
import { StatusTrackingModule } from "./StatusTrackingModule";
import { EscalatedTicketsModule } from "./EscalatedTicketsModule";
import { SUPPORT_EMAIL } from "@/lib/supportConstants";
import { buildTicketDashboardStats, type TicketDashboardStats } from "@/lib/ticketDashboardStats";
import { useHelpDeskNotificationFeed } from "@/app/hooks/useHelpDeskNotificationFeed";
import type { HelpDeskNotification } from "@/app/contexts/HelpDeskNotificationsContext";
import {
  IconChart,
  IconChat,
  IconCursor,
  IconForm,
  IconHeadphones,
  IconMail,
  IconPhone,
  IconShield,
  IconArrowLeft,
  IconTicket,
  IconAlertCircle,
} from "./AdminIcons";
import "../support/help.css";
import "./admin.css";
import "./manage-email.css";
import "./call-management.css";
import "./escalated-tickets.css";
import "./status-tracking-dashboard.css";

type Tab = "live-chat" | "manage-email" | "manage-call" | "manage-form" | "status-tracking" | "escalated-tickets";

const ADMIN_MODULES: {
  id: Tab;
  label: string;
  icon: React.ReactNode;
  hint: string;
  description: string;
  theme: "violet" | "blue" | "teal" | "orange" | "red";
  color: string;
}[] = [
  {
    id: "live-chat",
    label: "Live Agent Chat",
    icon: <IconChat size={28} />,
    hint: "Real-time conversations",
    description: "Accept chat requests, message users, and raise support tokens.",
    theme: "violet",
    color: "#2c4f72",
  },
  {
    id: "manage-form",
    label: "Ticket created through live chat",
    icon: <IconTicket size={28} />,
    hint: "Agent-raised tickets",
    description: "Support tickets raised by agents during live chat conversations.",
    theme: "violet",
    color: "#1e3a5f",
  },
  {
    id: "manage-email",
    label: "Manage Email",
    icon: <IconMail size={28} />,
    hint: "Inbox tickets",
    description: "Track inbound emails and respond to customer support requests.",
    theme: "blue",
    color: "#3170a5",
  },
  {
    id: "status-tracking",
    label: "Status & Tracking",
    icon: <IconChart size={28} />,
    hint: "All tickets",
    description: "All tickets — pending, open, resolved and closed.",
    theme: "teal",
    color: "#3d6b6b",
  },
  {
    id: "escalated-tickets",
    label: "Escalated Tickets",
    icon: <IconAlertCircle size={28} />,
    hint: "Technical escalation",
    description: "Escalated tickets, assignees, and technical team management.",
    theme: "red",
    color: "#b91c1c",
  },
  {
    id: "manage-call",
    label: "Call Management",
    icon: <IconPhone size={28} />,
    hint: "Callback queue",
    description: "Twilio call tracking, inbound logs, and support tickets.",
    theme: "orange",
    color: "#b45309",
  },
];

function parseAdminModule(value: string | null): Tab | null {
  if (!value) return null;
  return ADMIN_MODULES.some((m) => m.id === value) ? (value as Tab) : null;
}

export function AdminDashboard() {
  const [auth, setAuth] = useState<{ token: string; user: ReturnType<typeof getAuthFromStorage>["user"] }>({
    token: "",
    user: null,
  });
  const [mounted, setMounted] = useState(false);
  const [loginForm, setLoginForm] = useState({ name: "", email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [hubStats, setHubStats] = useState<TicketDashboardStats | null>(null);
  const [hubStatsLoading, setHubStatsLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeModule = parseAdminModule(searchParams.get("module"));
  const viewAnalytics = !activeModule && searchParams.get("view") === "analytics";
  const activeModuleMeta = ADMIN_MODULES.find((m) => m.id === activeModule);

  const openModule = (id: Tab) => {
    router.push(`${appPath("admin")}?module=${id}`);
  };

  const goToModuleHub = () => {
    router.push(appPath("admin"));
  };

  const openAnalytics = () => {
    router.push(`${appPath("admin")}?view=analytics`);
  };

  const openStatusFilter = (status: string) => {
    if (status === "ESCALATED") {
      router.push(`${appPath("admin")}?module=escalated-tickets`);
      return;
    }
    const params = new URLSearchParams();
    params.set("module", "status-tracking");
    if (status) params.set("status", status);
    router.push(`${appPath("admin")}?${params.toString()}`);
  };

  const handleOpenTicketNotification = useCallback((n: HelpDeskNotification) => {
    if (n?.eventType === "LIVE_CHAT_REQUEST" || n?.liveChatSessionId) {
      const params = new URLSearchParams({ module: "live-chat" });
      if (n.liveChatSessionId) params.set("sessionId", n.liveChatSessionId);
      router.push(`${appPath("admin")}?${params.toString()}`);
      return;
    }
    if (n?.eventType === "CALLBACK_REQUEST" || n?.callbackRequestId) {
      const params = new URLSearchParams({ module: "manage-call" });
      if (n.callbackRequestId) params.set("callbackId", n.callbackRequestId);
      router.push(`${appPath("admin")}?${params.toString()}`);
      return;
    }
    const params = new URLSearchParams({ module: "status-tracking", view: "all" });
    if (n?.ticketId) params.set("ticketId", n.ticketId);
    router.push(`${appPath("admin")}?${params.toString()}`);
  }, [router]);

  const isAllowed = auth.user?.accountType === "ADMIN" || auth.user?.currentRole === "HR";

  useHelpDeskNotificationFeed({
    enabled: Boolean(auth.token && isAllowed),
    visible: Boolean(auth.token && isAllowed && (!activeModule || viewAnalytics || activeModule === "live-chat")),
    onOpenTicket: handleOpenTicketNotification,
  });

  useEffect(() => {
    applyHelpAgentSsoFromUrl();
    setAuth(getAuthFromStorage());
    setMounted(true);
    const sync = () => setAuth(getAuthFromStorage());
    window.addEventListener("hs-auth-changed", sync);
    return () => window.removeEventListener("hs-auth-changed", sync);
  }, []);

  const loadHubStats = useCallback(async () => {
    if (!auth.token || !isAllowed) return;
    setHubStatsLoading(true);
    try {
      const [counts, tickets] = await Promise.all([
        supportApi.adminTicketStats(),
        supportApi.adminTickets(),
      ]);
      setHubStats(buildTicketDashboardStats(Array.isArray(tickets) ? tickets : [], counts || {}));
    } catch {
      setHubStats(null);
    } finally {
      setHubStatsLoading(false);
    }
  }, [auth.token, isAllowed]);

  useEffect(() => {
    if (!mounted || !auth.token || !isAllowed || activeModule) return;
    void loadHubStats();
    const id = window.setInterval(() => void loadHubStats(), 15000);
    return () => window.clearInterval(id);
  }, [mounted, auth.token, isAllowed, activeModule, loadHubStats]);

  const adminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await supportApi.helpAgentLogin(loginForm);
      setAuthInStorage(res.token, res.user);
    } catch (err: any) {
      setLoginError(err?.message || "Login failed");
    }
  };

  if (!mounted) {
    return (
      <div className="admin-login-page">
        <p className="sx-help-muted">Loadingâ€¦</p>
      </div>
    );
  }

  if (!auth.token || !isAllowed) {
    return (
      <div className="admin-login-page">
        <div className="admin-login-card">
          <div className="admin-login-brand">
            <span className="admin-brand-mark" aria-hidden>SX</span>
            <IconShield size={22} className="admin-login-shield" />
          </div>
          <h1>Help and Support Management</h1>
          <p>Sign in with your name, email, and help desk password to manage tickets, live chat, and callbacks.</p>
          <form onSubmit={adminLogin} className="admin-login-form">
            <label className="admin-field">
              <span>Name</span>
              <input required placeholder="Your full name" value={loginForm.name} onChange={(e) => setLoginForm((f) => ({ ...f, name: e.target.value }))} autoComplete="name" />
            </label>
            <label className="admin-field">
              <span>Email</span>
              <input required type="email" placeholder="you@company.com" value={loginForm.email} onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))} />
            </label>
            <label className="admin-field">
              <span>Password</span>
              <input required type="password" placeholder="Help desk password" value={loginForm.password} onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))} />
            </label>
            {loginError ? <p className="admin-error">{loginError}</p> : null}
            <button type="submit" className="admin-btn-primary">Sign in</button>
          </form>
          <Link href={appPath("/")} className="admin-login-back">â† Back to Help &amp; Support</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`admin-page${!activeModule ? " admin-page--hub" : " admin-page--module"}${viewAnalytics ? " admin-page--analytics" : ""}${activeModule === "live-chat" ? " admin-page--live-chat" : ""}${activeModule === "manage-call" ? " admin-page--call-management" : ""}${activeModule === "status-tracking" ? " admin-page--status-tracking" : ""}${activeModule === "escalated-tickets" ? " admin-page--escalated-tickets" : ""}`}>
      {!activeModule ? (
        viewAnalytics ? (
          <HelpSupportAnalyticsPage
            stats={hubStats}
            loading={hubStatsLoading}
            onBack={goToModuleHub}
          />
        ) : (
          <AdminHubDashboard
            stats={hubStats}
            loading={hubStatsLoading}
            modules={ADMIN_MODULES}
            onOpenModule={(id) => openModule(id as Tab)}
            onOpenAnalytics={openAnalytics}
            onFilterByStatus={openStatusFilter}
          />
        )
      ) : activeModule === "live-chat" ? (
        <div className="admin-live-chat-shell">
          <div className="me-module-toolbar me-module-toolbar--live-chat">
            <div className="me-module-toolbar__brand">
              <span className="me-module-toolbar__icon me-module-toolbar__icon--live" aria-hidden>
                <IconHeadphones size={20} />
              </span>
              <div>
                <p className="me-module-toolbar__eyebrow">HELP &amp; SUPPORT</p>
                <h2>Live Agent Chat</h2>
              </div>
            </div>
            <button type="button" className="me-module-back me-module-back--right" onClick={goToModuleHub}>
              <IconArrowLeft size={16} />
              Back to dashboard
            </button>
          </div>
          <div className="admin-workspace admin-workspace--live-chat">
            <AdminLiveChatPanel />
          </div>
        </div>
      ) : (
        <>
          {activeModule === "manage-email" ? (
            <div className="me-module-toolbar">
              <div className="me-module-toolbar__brand">
                <p className="me-module-toolbar__eyebrow">HELP &amp; SUPPORT</p>
                <h2>Manage Email</h2>
                <p className="me-module-toolbar__sub">Inbound emails to {SUPPORT_EMAIL}</p>
              </div>
              <div className="me-module-toolbar__actions">
                {auth.user ? (
                  <div className="me-agent-badge">
                    Agent: {auth.user.fullName || auth.user.email} · {auth.user.email}
                  </div>
                ) : null}
                <button type="button" className="me-module-back me-module-back--right" onClick={goToModuleHub}>
                  <IconArrowLeft size={16} />
                  Back to dashboard
                </button>
              </div>
            </div>
          ) : activeModule === "manage-form" ? (
            <div className="me-module-toolbar">
              <div className="me-module-toolbar__brand">
                <p className="me-module-toolbar__eyebrow">HELP &amp; SUPPORT</p>
                <h2>Live agent ticket created</h2>
                <p className="me-module-toolbar__sub">Tickets raised by agents from live chat</p>
              </div>
              <div className="me-module-toolbar__actions">
                {auth.user ? (
                  <div className="me-agent-badge">
                    Agent: {auth.user.fullName || auth.user.email} · {auth.user.email}
                  </div>
                ) : null}
                <button type="button" className="me-module-back me-module-back--right" onClick={goToModuleHub}>
                  <IconArrowLeft size={16} />
                  Back to dashboard
                </button>
              </div>
            </div>
          ) : activeModule === "manage-call" ? (
            <header className="hs-admin__header hs-admin__header--call-management">
              <div className="hs-admin__header-accent" aria-hidden />
              <div className="hs-admin__header-inner">
                <div className="hs-admin__header-brand">
                  <div className="hs-admin__header-icon" aria-hidden>
                    <IconPhone size={22} />
                  </div>
                  <div className="hs-admin__header-text">
                    <span className="hs-admin__header-eyebrow">Help &amp; Support</span>
                    <h1 className="hs-admin__title">Call Management</h1>
                    <p className="hs-admin__subtitle">Twilio call tracking and inbound ticket logging</p>
                  </div>
                </div>
                <div className="hs-admin__header-actions">
                  {auth.user ? (
                    <div className="me-agent-badge">
                      Agent: {auth.user.fullName || auth.user.email} · {auth.user.email}
                    </div>
                  ) : null}
                  <button type="button" className="hs-admin__back" onClick={goToModuleHub}>
                    <IconArrowLeft size={16} />
                    Back to dashboard
                  </button>
                </div>
              </div>
            </header>
          ) : activeModule === "status-tracking" ? (
            <header className="hs-admin__header hs-admin__header--status-tracking">
              <div className="hs-admin__header-accent" aria-hidden />
              <div className="hs-admin__header-inner">
                <div className="hs-admin__header-brand">
                  <div className="hs-admin__header-icon hs-admin__header-icon--status-tracking" aria-hidden>
                    <IconChart size={22} />
                  </div>
                  <div className="hs-admin__header-text">
                    <span className="hs-admin__header-eyebrow">Help &amp; Support</span>
                    <h1 className="hs-admin__title">Status &amp; Tracking</h1>
                    <p className="hs-admin__subtitle">All tickets — pending, open, resolved and closed.</p>
                  </div>
                </div>
                <div className="hs-admin__header-actions">
                  {auth.user ? (
                    <div className="me-agent-badge">
                      Agent: {auth.user.fullName || auth.user.email} · {auth.user.email}
                    </div>
                  ) : null}
                  <button type="button" className="hs-admin__back" onClick={goToModuleHub}>
                    <IconArrowLeft size={16} />
                    Back to dashboard
                  </button>
                </div>
              </div>
            </header>
          ) : activeModule === "escalated-tickets" ? (
            <header className="hs-admin__header hs-admin__header--escalated">
              <div className="hs-admin__header-accent" aria-hidden />
              <div className="hs-admin__header-inner">
                <div className="hs-admin__header-brand">
                  <div className="hs-admin__header-icon hs-admin__header-icon--escalated" aria-hidden>
                    <IconAlertCircle size={22} />
                  </div>
                  <div className="hs-admin__header-text">
                    <span className="hs-admin__header-eyebrow">Help &amp; Support</span>
                    <h1 className="hs-admin__title">Escalated Tickets</h1>
                    <p className="hs-admin__subtitle">Escalated tickets, assignees, and technical team management.</p>
                  </div>
                </div>
                <div className="hs-admin__header-actions">
                  {auth.user ? (
                    <div className="me-agent-badge">
                      Agent: {auth.user.fullName || auth.user.email} · {auth.user.email}
                    </div>
                  ) : null}
                  <button type="button" className="hs-admin__back" onClick={goToModuleHub}>
                    <IconArrowLeft size={16} />
                    Back to dashboard
                  </button>
                </div>
              </div>
            </header>
          ) : (
            <div className="admin-module-toolbar">
              <div className="admin-module-toolbar__meta">
                <h2>{activeModuleMeta?.label}</h2>
                <p>{activeModuleMeta?.hint}</p>
              </div>
              <button type="button" className="admin-module-back admin-module-back--right" onClick={goToModuleHub}>
                <IconArrowLeft size={16} />
                Back to dashboard
              </button>
            </div>
          )}

          <div className={`admin-workspace${activeModule === "manage-call" ? " admin-workspace--call-management" : ""}${activeModule === "status-tracking" ? " admin-workspace--status-tracking" : ""}${activeModule === "escalated-tickets" ? " admin-workspace--escalated-tickets" : ""}`}>
            {activeModule === "manage-email" && (
              <ManageEmailModule agentUser={auth.user} />
            )}
            {activeModule === "manage-call" && <CallManagementModule />}
            {activeModule === "manage-form" && (
              <ManageFormModule agentUser={auth.user} />
            )}
            {activeModule === "status-tracking" && <StatusTrackingModule agentUser={auth.user} />}
            {activeModule === "escalated-tickets" && <EscalatedTicketsModule />}
          </div>
        </>
      )}
    </div>
  );
}


/* â”€â”€ Customer history (grouped requests) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
type CustomerHistoryData = { callbacks: any[]; tickets: any[] };


function customerInitials(name?: string | null): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatRelativeTime(value?: string | Date | null): string {
  if (!value) return "â€”";
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
      <h4>
        All activity for this customer
        <span className="admin-customer-count-badge">{total} total</span>
      </h4>

      {onSelectCallback && callbacks.length > 0 ? (
        <div className="admin-customer-history-section">
          <p>Callback requests ({callbacks.length})</p>
          {callbacks.map((c) => (
            <button
              key={String(c._id)}
              type="button"
              className={`admin-customer-history-item ${String(selectedCallbackId) === String(c._id) ? "selected" : ""}`}
              onClick={() => onSelectCallback(c)}
            >
              {c.ticketNumber || callbackReference(String(c._id))} Â·{" "}
              {c.createdAt ? new Date(c.createdAt).toLocaleString() : "â€”"} Â·{" "}
              <span style={{ color: callbackStatusColor(c.status) }}>{callbackStatusLabel(c.status)}</span>
            </button>
          ))}
        </div>
      ) : null}

      {onSelectTicket && tickets.length > 0 ? (
        <div className="admin-customer-history-section">
          <p>Support tickets ({tickets.length})</p>
          {tickets.map((t) => (
            <button
              key={String(t._id)}
              type="button"
              className={`admin-customer-history-item ${String(selectedTicketId) === String(t._id) ? "selected" : ""}`}
              onClick={() => onSelectTicket(t)}
            >
              {t.ticketNumber} Â· {t.subject} Â·{" "}
              <span style={{ color: statusColor(t.status) }}>{statusLabel(t.status)}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
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

function ticketHasOtherAssignee(ticket: any, agentId?: string, agentEmail?: string) {
  const has = ticket?.assignedAdminId || ticket?.assignedAgentId || ticket?.assignedAdminEmail || ticket?.assignedAgentEmail;
  return Boolean(has) && !ticketAssignedToAgent(ticket, agentId, agentEmail);
}

/* ── Ticket List Panel (Email / Form) ── */
function TicketListPanel({
  channel, title, mode, agentUser,
}: {
  channel: string;
  title: string;
  mode: "email" | "form";
  agentUser: { id: string; email: string; fullName: string } | null;
}) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [customerHistory, setCustomerHistory] = useState<CustomerHistoryData>({ callbacks: [], tickets: [] });
  const [loading, setLoading] = useState(true);
  const [emailTemplateId, setEmailTemplateId] = useState(SUPPORT_EMAIL_TEMPLATES[0]?.id || "");
  const [smsTemplateId, setSmsTemplateId] = useState(SUPPORT_SMS_TEMPLATES[0]?.id || "");
  const [emailPreview, setEmailPreview] = useState("");
  const [smsPreview, setSmsPreview] = useState("");
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySms, setNotifySms] = useState(false);
  const [actionStatus, setActionStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [detailTab, setDetailTab] = useState<"overview" | "contact" | "activity">("overview");
  const [accepting, setAccepting] = useState(false);

  const agentId = agentUser?.id;
  const agentEmail = agentUser?.email;
  const canUpdateStatus = detail?.ticket
    ? ticketAssignedToAgent(detail.ticket, agentId, agentEmail)
    : false;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await supportApi.adminTickets({ channel });
      setTickets(Array.isArray(data) ? data : []);
    } catch { setTickets([]); }
    finally { setLoading(false); }
  }, [channel]);

  useEffect(() => { void load(); const id = window.setInterval(() => void load(), 8000); return () => window.clearInterval(id); }, [load]);

  useEffect(() => {
    if (!detail?.ticket) return;
    const vars = buildTemplateVars(detail.ticket);
    const emailTpl = SUPPORT_EMAIL_TEMPLATES.find((t) => t.id === emailTemplateId);
    const smsTpl = SUPPORT_SMS_TEMPLATES.find((t) => t.id === smsTemplateId);
    setEmailPreview(emailTpl ? renderTemplate(emailTpl.body, vars) : "");
    setSmsPreview(smsTpl ? renderTemplate(smsTpl.body, vars) : "");
  }, [detail, emailTemplateId, smsTemplateId]);

  const openTicket = async (t: any) => {
    setSelected(t);
    setDetailTab("overview");
    setActionStatus("");
    try {
      const [d, history] = await Promise.all([
        supportApi.adminTicketDetail(String(t._id)),
        supportApi.adminCustomerHistory({ phone: t.phone, email: t.email }),
      ]);
      setDetail(d);
      setCustomerHistory(history);
      const statusTpl = SUPPORT_EMAIL_TEMPLATES.find((x) => x.forStatus === d.ticket.status);
      if (statusTpl) setEmailTemplateId(statusTpl.id);
    } catch {
      setDetail(null);
      setCustomerHistory({ callbacks: [], tickets: [] });
    }
  };

  const refreshDetail = async (ticketId: string) => {
    const d = await supportApi.adminTicketDetail(ticketId);
    setDetail(d);
    await load();
  };

  const changeStatus = async (ticketId: string, status: string) => {
    setActionStatus("Updating statusâ€¦");
    try {
      const r = await supportApi.adminUpdateTicketStatus(ticketId, status, { notifyEmail, notifySms });
      await refreshDetail(ticketId);
      const notes: string[] = ["Status updated."];
      if (r.notifications?.email) notes.push(`Email: ${r.notifications.email}`);
      if (r.notifications?.sms) notes.push(`SMS: ${r.notifications.sms}`);
      setActionStatus(notes.join(" "));
    } catch (e: any) {
      setActionStatus(e?.message || "Status update failed");
    }
  };

  const acceptTicket = async (ticketId: string) => {
    setAccepting(true);
    setActionStatus("");
    try {
      const r = await supportApi.adminAcceptTicket(ticketId);
      if (selected && String(selected._id) === ticketId) {
        await refreshDetail(ticketId);
      }
      await load();
      setActionStatus(r.ticket?.assignedAdminName
        ? `Ticket assigned to ${r.ticket.assignedAdminName}`
        : "Ticket accepted");
    } catch (e: any) {
      setActionStatus(e?.message || "Could not accept ticket");
    } finally {
      setAccepting(false);
    }
  };

  const sendEmail = async () => {
    if (!selected) return;
    setActionStatus("Sending emailâ€¦");
    try {
      const r = await supportApi.adminSendEmail({
        ticketId: String(selected._id),
        templateId: emailTemplateId,
        body: emailPreview,
      });
      setActionStatus(r.message || "Email sent");
      await refreshDetail(String(selected._id));
    } catch (e: any) {
      setActionStatus(e?.message || "Email failed");
    }
  };

  const sendSms = async () => {
    if (!selected) return;
    setActionStatus("Sending SMSâ€¦");
    try {
      const r = await supportApi.adminSendSms({
        ticketId: String(selected._id),
        templateId: smsTemplateId,
        message: smsPreview,
      });
      setActionStatus(r.message || "SMS sent");
      await refreshDetail(String(selected._id));
    } catch (e: any) {
      setActionStatus(e?.message || "SMS failed");
    }
  };

  const showEmailTools = mode === "email" || mode === "form";
  const showSmsTools = mode === "email" || mode === "form";
  const showNotifyOptions = mode === "email" || mode === "form";

  const subtitle =
    mode === "email"
      ? "Email inquiries â€” tickets created automatically for each submission"
      : "Support form submissions â€” grouped by customer";

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: tickets.length };
    for (const s of TICKET_STATUSES) {
      counts[s.id] = tickets.filter((t) => t.status === s.id).length;
    }
    return counts;
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    if (statusFilter === "ALL") return tickets;
    return tickets.filter((t) => t.status === statusFilter);
  }, [tickets, statusFilter]);

  const groupedTickets = useMemo(
    () =>
      groupByCustomer(filteredTickets, (t) => ({
        phone: t.phone,
        email: t.email,
        name: t.name,
        createdAt: t.createdAt,
      })),
    [filteredTickets],
  );

  const selectedGroupKey = selected
    ? customerKey({ phone: selected.phone, email: selected.email, name: selected.name })
    : "";

  const selectTicketGroup = (group: CustomerGroup<any>) => {
    void openTicket(group.items[0]);
  };

  const searchedTicketGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groupedTickets;
    return groupedTickets.filter(
      (g) =>
        g.label.toLowerCase().includes(q) ||
        (g.phone || "").includes(q) ||
        (g.email || "").toLowerCase().includes(q) ||
        g.items.some((t) => String(t.ticketNumber || "").toLowerCase().includes(q) || String(t.subject || "").toLowerCase().includes(q)),
    );
  }, [groupedTickets, searchQuery]);

  return (
    <div className="admin-ticket-panel admin-call-panel">
      <div className="admin-call-header">
        <div>
          <h2>{title}</h2>
          <p className="admin-subtitle">{subtitle}</p>
        </div>
        <div className="admin-call-quick-stats">
          <span className="admin-stat-pill">{tickets.length} ticket{tickets.length !== 1 ? "s" : ""}</span>
          <span className="admin-stat-pill">{groupedTickets.length} customer{groupedTickets.length !== 1 ? "s" : ""}</span>
          <span className="admin-stat-pill">{channelLabel(channel)}</span>
        </div>
      </div>

      <div className="admin-call-workspace">
        <div className="admin-call-list-toolbar">
          <div className="admin-call-filters admin-call-filters--inline">
            <button
              type="button"
              className={`admin-filter-chip ${statusFilter === "ALL" ? "active" : ""}`}
              onClick={() => setStatusFilter("ALL")}
            >
              All
              <span className="admin-filter-count">{statusCounts.ALL ?? 0}</span>
            </button>
            {TICKET_STATUSES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`admin-filter-chip ${statusFilter === s.id ? "active" : ""}`}
                onClick={() => setStatusFilter(s.id)}
              >
                {s.label}
                <span className="admin-filter-count">{statusCounts[s.id] ?? 0}</span>
              </button>
            ))}
          </div>
          <div className="admin-search-wrap">
            <input
              type="search"
              className="admin-search-input"
              placeholder="Search ticket #, name, emailâ€¦"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="admin-ticket-grid admin-call-grid">
          <div className="admin-ticket-list admin-customer-list">
            <div className="admin-list-head">
              <strong>Customers</strong>
              <span className="admin-list-count">{searchedTicketGroups.length}</span>
            </div>
            {loading ? <p className="sx-help-muted">Loadingâ€¦</p> : null}
            {searchedTicketGroups.map((group) => {
              const primary = group.items[0];
              const isSelected = selectedGroupKey === group.key;
              const openCount = group.items.filter((t) => t.status !== "RESOLVED" && t.status !== "CLOSED").length;
              return (
                <button
                  key={group.key}
                  type="button"
                  className={`admin-customer-card ${isSelected ? "selected" : ""} ${openCount > 0 ? "has-pending" : ""}`}
                  onClick={() => selectTicketGroup(group)}
                >
                  <span className="admin-customer-avatar" aria-hidden>{customerInitials(group.label)}</span>
                  <span className="admin-customer-card-body">
                    <span className="admin-customer-card-top">
                      <span className="admin-customer-name">{group.label}</span>
                      <span
                        className="admin-status-pill"
                        style={{ color: statusColor(primary.status), borderColor: statusColor(primary.status) }}
                      >
                        {statusLabel(primary.status)}
                      </span>
                    </span>
                    <span className="admin-customer-card-meta">
                      {primary.ticketNumber} Â· {formatRelativeTime(primary.createdAt)}
                    </span>
                    <span className="admin-customer-card-meta">{primary.subject}</span>
                    <span className="admin-customer-card-tags">
                      {group.items.length > 1 ? (
                        <span className="admin-customer-count-badge">{group.items.length} tickets</span>
                      ) : null}
                      {openCount > 0 && group.items.length > 1 ? (
                        <span className="admin-customer-count-badge admin-customer-count-badge--warn">{openCount} open</span>
                      ) : null}
                    </span>
                  </span>
                </button>
              );
            })}
            {!loading && tickets.length === 0 ? (
              <div className="admin-empty-state">
                <div className="admin-empty-graphic" aria-hidden>{mode === "email" ? <IconMail size={36} /> : <IconForm size={36} />}</div>
                <p><strong>No tickets yet</strong></p>
                <p className="admin-hint">New {mode === "email" ? "email inquiries" : "form submissions"} appear here automatically.</p>
              </div>
            ) : null}
            {!loading && filteredTickets.length > 0 && searchedTicketGroups.length === 0 ? (
              <div className="admin-empty-state">
                <p><strong>No matches</strong></p>
                <p className="admin-hint">Try a different search or filter.</p>
              </div>
            ) : null}
          </div>

          <div className="admin-ticket-detail admin-call-detail">
            {selected && detail ? (
              <>
                <div className="admin-call-detail-head">
                  <span className="admin-customer-avatar admin-customer-avatar--lg" aria-hidden>
                    {customerInitials(detail.ticket.name || detail.ticket.email)}
                  </span>
                  <div className="admin-call-detail-title">
                    <h3>{detail.ticket.ticketNumber}</h3>
                    <p className="admin-call-detail-meta">
                      {detail.ticket.name || detail.ticket.email}
                      {detail.ticket.phone ? ` Â· ${detail.ticket.phone}` : ""}
                      {" Â· "}
                      {formatRelativeTime(detail.ticket.createdAt)}
                    </p>
                  </div>
                  <span
                    className="admin-status-pill admin-status-pill--lg"
                    style={{ color: statusColor(detail.ticket.status), borderColor: statusColor(detail.ticket.status) }}
                  >
                    {statusLabel(detail.ticket.status)}
                  </span>
                </div>

                <div className="admin-detail-tabs" role="tablist">
                  <button type="button" role="tab" className={detailTab === "overview" ? "active" : ""} onClick={() => setDetailTab("overview")}>
                    Ticket
                  </button>
                  <button type="button" role="tab" className={detailTab === "contact" ? "active" : ""} onClick={() => setDetailTab("contact")}>
                    Contact
                  </button>
                  <button type="button" role="tab" className={detailTab === "activity" ? "active" : ""} onClick={() => setDetailTab("activity")}>
                    Activity{detail.messages?.length ? ` (${detail.messages.length})` : ""}
                  </button>
                </div>

                {detailTab === "overview" ? (
                  <>
                    <CustomerHistoryBlock
                      history={customerHistory}
                      selectedTicketId={String(selected._id)}
                      onSelectTicket={(t) => void openTicket(t)}
                    />
                    <div className="admin-ticket-info-grid">
                      <p><b>Email:</b> {detail.ticket.email}</p>
                      <p><b>Category:</b> {detail.ticket.category}</p>
                      <p><b>Channel:</b> {channelLabel(detail.ticket.channel)}</p>
                      <p><b>Created:</b> {detail.ticket.createdAt ? new Date(detail.ticket.createdAt).toLocaleString() : "â€”"}</p>
                    </div>
                    <p><b>Subject:</b> {detail.ticket.subject}</p>
                    <div className="admin-ticket-desc">{detail.ticket.description}</div>
                    {ticketNeedsAccept(detail.ticket) ? (
                      <div className="admin-ticket-accept-row">
                        <button type="button" className="admin-btn-primary admin-btn-sm" disabled={accepting} onClick={() => void acceptTicket(String(selected._id))}>
                          {accepting ? "Accepting…" : "Accept ticket"}
                        </button>
                        <p className="admin-hint">Accept this ticket to assign it to you before updating status.</p>
                      </div>
                    ) : ticketAssignedToAgent(detail.ticket, agentId, agentEmail) ? (
                      <p className="admin-hint admin-hint--ok">Assigned to you — you can update status below.</p>
                    ) : ticketHasOtherAssignee(detail.ticket, agentId, agentEmail) ? (
                      <p className="admin-hint admin-hint--warn">
                        Assigned to {detail.ticket.assignedAdminName || detail.ticket.assignedAdminEmail || "another agent"}.
                        Only they can update status.
                      </p>
                    ) : null}
                    <div className="admin-status-change">
                      <label>Update status:</label>
                      <select
                        value={detail.ticket.status}
                        disabled={!canUpdateStatus}
                        onChange={(e) => void changeStatus(String(selected._id), e.target.value)}
                      >
                        {TICKET_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    </div>
                    {showNotifyOptions ? (
                      <div className="admin-notify-options">
                        <label><input type="checkbox" checked={notifyEmail} onChange={(e) => setNotifyEmail(e.target.checked)} /> Email on status change</label>
                        <label><input type="checkbox" checked={notifySms} onChange={(e) => setNotifySms(e.target.checked)} disabled={!detail.ticket.phone} /> SMS on status change</label>
                      </div>
                    ) : null}
                    {actionStatus ? <p className="admin-action-status">{actionStatus}</p> : null}
                  </>
                ) : null}

                {detailTab === "contact" ? (
                  <>
                    {showEmailTools ? (
                      <div className="admin-composer admin-email-composer">
                        <h4>Send email</h4>
                        <select value={emailTemplateId} onChange={(e) => setEmailTemplateId(e.target.value)}>
                          {SUPPORT_EMAIL_TEMPLATES.map((t) => (
                            <option key={t.id} value={t.id}>{t.label}</option>
                          ))}
                        </select>
                        <textarea rows={8} value={emailPreview} onChange={(e) => setEmailPreview(e.target.value)} />
                        <button type="button" className="admin-btn-sm" onClick={() => void sendEmail()} disabled={!emailPreview.trim()}>
                          Send email to {detail.ticket.email}
                        </button>
                      </div>
                    ) : null}
                    {showSmsTools && detail.ticket.phone ? (
                      <div className="admin-composer admin-sms-composer">
                        <h4>Send SMS</h4>
                        <select value={smsTemplateId} onChange={(e) => setSmsTemplateId(e.target.value)}>
                          {SUPPORT_SMS_TEMPLATES.map((t) => (
                            <option key={t.id} value={t.id}>{t.label}</option>
                          ))}
                        </select>
                        <textarea rows={4} value={smsPreview} onChange={(e) => setSmsPreview(e.target.value)} maxLength={320} />
                        <button type="button" className="admin-btn-sm" onClick={() => void sendSms()} disabled={!smsPreview.trim()}>
                          Send SMS to {detail.ticket.phone}
                        </button>
                      </div>
                    ) : null}
                    {showSmsTools && !detail.ticket.phone ? (
                      <p className="admin-hint">No phone on this ticket â€” SMS unavailable.</p>
                    ) : null}
                    {actionStatus ? <p className="admin-action-status">{actionStatus}</p> : null}
                  </>
                ) : null}

                {detailTab === "activity" ? (
                  detail.messages?.length > 0 ? (
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
                  )
                ) : null}
              </>
            ) : (
              <div className="admin-empty-state admin-empty-state--detail">
                <div className="admin-empty-graphic" aria-hidden><IconCursor size={36} /></div>
                <p><strong>Select a customer</strong></p>
                <p className="admin-hint">Pick someone from the list to view their ticket, update status, or contact them.</p>
                <ol className="admin-call-steps">
                  <li>Use filters or search to find a customer</li>
                  <li>Select them from the left list</li>
                  <li>Update status on <strong>Ticket</strong> or send messages on <strong>Contact</strong></li>
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

