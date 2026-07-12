"use client";

import type { TicketDashboardStats } from "@/lib/ticketDashboardStats";
import {
  IconAlertCircle,
  IconArrowUpRight,
  IconChart,
  IconCheckCircle,
  IconClock,
  IconTicket,
  IconTrendingUp,
} from "./AdminIcons";
import { useHelpDeskNotifications } from "@/app/contexts/HelpDeskNotificationsContext";
import { HelpSupportNotificationBell } from "./HelpSupportNotificationBell";

type ModuleCard = {
  id: string;
  label: string;
  hint: string;
  description: string;
  icon: React.ReactNode;
  theme: "violet" | "blue" | "teal" | "orange" | "red";
  color: string;
};

type Props = {
  stats: TicketDashboardStats | null;
  loading: boolean;
  modules: ModuleCard[];
  onOpenModule: (id: string) => void;
  onOpenAnalytics: () => void;
  onFilterByStatus: (status: string) => void;
};

function KpiCard({
  icon: Icon,
  label,
  value,
  tone = "blue",
  hint,
  onClick,
  title,
}: {
  icon: typeof IconTicket;
  label: string;
  value: number | string;
  tone?: string;
  hint?: string;
  onClick?: () => void;
  title?: string;
}) {
  const className = `hs-admin-hub__kpi hs-admin-hub__kpi--${tone}${onClick ? " hs-admin-hub__kpi--clickable" : ""}`;
  const content = (
    <>
      <span className="hs-admin-hub__kpi-icon" aria-hidden>
        <Icon size={18} />
      </span>
      <strong>{value}</strong>
      <span>{label}</span>
      {hint ? <em>{hint}</em> : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick} title={title}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}

export function AdminHubDashboard({
  stats,
  loading,
  modules,
  onOpenModule,
  onOpenAnalytics,
  onFilterByStatus,
}: Props) {
  const helpDeskNotifications = useHelpDeskNotifications();

  if (loading && !stats) {
    return (
      <section className="hs-admin-hub" aria-label="Help desk hub">
        <header className="admin-page__hero hs-admin-hub__hero-unified">
          <div className="hs-admin-hub__hero-main">
            <p className="admin-page__eyebrow">SX Workforce Admin · Support desk</p>
            <h1 className="admin-page__title">Help &amp; Support Management</h1>
            <p className="admin-page__subtitle">Loading ticket overview…</p>
          </div>
        </header>
        <div className="hs-admin-hub__kpis">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="hs-admin-hub__kpi hs-admin-hub__kpi--skeleton" />
          ))}
        </div>
      </section>
    );
  }

  const s = stats || {
    totalTickets: 0,
    openTickets: 0,
    inProgressTickets: 0,
    pendingTickets: 0,
    pendingWithUserTickets: 0,
    escalatedTickets: 0,
    resolvedTickets: 0,
    resolutionRatePercent: 0,
  };
  const total = s.totalTickets ?? 0;

  return (
    <section className="hs-admin-hub" aria-label="Help desk hub">
      <header className="admin-page__hero hs-admin-hub__hero-unified">
        <div className="hs-admin-hub__hero-main">
          <p className="admin-page__eyebrow">SX Workforce Admin · Support desk</p>
          <h1 className="admin-page__title">Help &amp; Support Management</h1>
          <p className="admin-page__subtitle">
            Tickets, omnichannel support &amp; analytics — open a workflow module to respond to customers.
          </p>
          <div className="hs-admin-hub__hero-chips">
            <span>{s.openTickets ?? 0} open</span>
            <span>{s.pendingTickets ?? 0} pending</span>
            <span>{s.pendingWithUserTickets ?? 0} with user</span>
            <span>{total} total</span>
          </div>
        </div>
        <div className="hs-admin-hub__hero-aside">
          <button type="button" className="hs-admin-hub__analytics-btn" onClick={onOpenAnalytics}>
            <IconChart size={16} />
            Analytics
          </button>
          {helpDeskNotifications.visible ? (
            <HelpSupportNotificationBell
              placement="hero"
              notifications={helpDeskNotifications.notifications}
              unreadCount={helpDeskNotifications.unreadCount}
              loading={helpDeskNotifications.loading}
              onMarkRead={helpDeskNotifications.onMarkRead || undefined}
              onMarkAllRead={helpDeskNotifications.onMarkAllRead || undefined}
              onOpenTicket={helpDeskNotifications.onOpenTicket || undefined}
            />
          ) : null}
          <div className="hs-admin-hub__hero-metric">
            <span>Resolution rate</span>
            <strong>{s.resolutionRatePercent ?? 0}%</strong>
            <IconTrendingUp size={16} />
          </div>
        </div>
      </header>

      <div className="hs-admin-hub__kpis">
        <KpiCard
          icon={IconTicket}
          label="Total tickets"
          value={total}
          tone="blue"
          onClick={() => onFilterByStatus("")}
          title="View all tickets"
        />
        <KpiCard
          icon={IconAlertCircle}
          label="Open"
          value={s.openTickets ?? 0}
          tone="indigo"
          onClick={() => onFilterByStatus("OPEN")}
          title="View open tickets"
        />
        <KpiCard
          icon={IconClock}
          label="Pending"
          value={s.pendingTickets ?? 0}
          tone="amber"
          hint="Awaiting action"
          onClick={() => onFilterByStatus("PENDING")}
          title="View pending tickets"
        />
        <KpiCard
          icon={IconClock}
          label="Pending with User"
          value={s.pendingWithUserTickets ?? 0}
          tone="cyan"
          hint="Awaiting customer"
          onClick={() => onFilterByStatus("PENDING_WITH_USER")}
          title="View tickets pending with user"
        />
        <KpiCard
          icon={IconArrowUpRight}
          label="In progress"
          value={s.inProgressTickets ?? 0}
          tone="violet"
          onClick={() => onFilterByStatus("IN_PROGRESS")}
          title="View in-progress tickets"
        />
        <KpiCard
          icon={IconAlertCircle}
          label="Escalated"
          value={s.escalatedTickets ?? 0}
          tone="red"
          onClick={() => onFilterByStatus("ESCALATED")}
          title="View escalated tickets"
        />
        <KpiCard
          icon={IconCheckCircle}
          label="Resolved"
          value={s.resolvedTickets ?? 0}
          tone="green"
          onClick={() => onFilterByStatus("RESOLVED")}
          title="View resolved tickets"
        />
      </div>

      <div className="hs-admin-hub__workflows-head">
        <h3>Manage workflows</h3>
        <p>Open a desk module to respond to tickets, chat, email, and calls.</p>
      </div>
      <div className="admin-hub-grid">
        {modules.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`admin-hub-card admin-hub-card--${m.theme}`}
            onClick={() => onOpenModule(m.id)}
            title={m.hint}
          >
            <span
              className="admin-hub-card__icon"
              style={{ background: `${m.color}22`, color: m.color }}
              aria-hidden
            >
              {m.icon}
            </span>
            <span className="admin-hub-card__label">{m.label}</span>
            <span className="admin-hub-card__desc">{m.description}</span>
            <span className="admin-hub-card__arrow" aria-hidden>
              Open module →
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
