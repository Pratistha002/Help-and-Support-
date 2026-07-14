"use client";

import type { TicketDashboardStats } from "@/lib/ticketDashboardStats";
import { TICKET_STATUSES } from "@/lib/ticketConstants";
import { CONSUMER_TYPES } from "@/lib/supportConstants";
import { IconArrowLeft, IconClock, IconStar, IconTrendingUp } from "./AdminIcons";
import { useHelpDeskNotifications } from "@/app/contexts/HelpDeskNotificationsContext";
import { HelpSupportNotificationBell } from "./HelpSupportNotificationBell";
import "./help-support-analytics.css";

const CHANNEL_META: Record<string, { label: string; color: string }> = {
  TICKET_FORM: { label: "Support Form", color: "#3170a5" },
  EMAIL: { label: "Email", color: "#3b82f6" },
  CALL: { label: "Call", color: "#f97316" },
  LIVE_CHAT: { label: "Live Chat", color: "#0d9488" },
  ADMIN_RAISED: { label: "Live Agent", color: "#1e3a5f" },
};

const EXCLUDED_CHANNELS = new Set(["SMS", "WHATSAPP", "AI_CHAT"]);

const PRIORITY_META: Record<string, { label: string; color: string }> = {
  LOW: { label: "Low", color: "#94a3b8" },
  MEDIUM: { label: "Medium", color: "#3b82f6" },
  HIGH: { label: "High", color: "#f59e0b" },
};

const STATUS_ORDER = ["OPEN", "IN_PROGRESS", "PENDING", "PENDING_WITH_USER", "ESCALATED", "RESOLVED", "CLOSED"];

function buildDonutGradient(byStatus: Record<string, number>) {
  const entries = STATUS_ORDER
    .map((key) => ({ key, count: byStatus?.[key] || 0 }))
    .filter((e) => e.count > 0);
  const total = entries.reduce((s, e) => s + e.count, 0) || 1;
  let acc = 0;
  const stops = entries.map(({ key, count }) => {
    const pct = (count / total) * 100;
    const color = TICKET_STATUSES.find((s) => s.id === key)?.color || "#94a3b8";
    const start = acc;
    acc += pct;
    return `${color} ${start}% ${acc}%`;
  });
  if (stops.length === 0) return "conic-gradient(#e2e8f0 0% 100%)";
  return `conic-gradient(${stops.join(", ")})`;
}

function BarChart({
  title,
  subtitle,
  items,
  emptyLabel = "No data yet",
}: {
  title: string;
  subtitle?: string;
  items: { key: string; label: string; color: string; value: number }[];
  emptyLabel?: string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  if (items.length === 0 || items.every((i) => i.value === 0)) {
    return (
      <div className="hs-admin-hub__panel">
        <div className="hs-admin-hub__panel-head">
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        <p className="hs-admin-hub__empty">{emptyLabel}</p>
      </div>
    );
  }
  return (
    <div className="hs-admin-hub__panel">
      <div className="hs-admin-hub__panel-head">
        <h3>{title}</h3>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      <div className="hs-admin-hub__bars">
        {items.map((item) => (
          <div key={item.key} className="hs-admin-hub__bar-row">
            <span className="hs-admin-hub__bar-label">{item.label}</span>
            <div className="hs-admin-hub__bar-track" aria-hidden>
              <div
                className="hs-admin-hub__bar-fill"
                style={{
                  width: `${Math.max((item.value / max) * 100, item.value > 0 ? 8 : 0)}%`,
                  background: item.color,
                }}
              />
            </div>
            <span className="hs-admin-hub__bar-value">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildAnalyticsData(stats: TicketDashboardStats | null) {
  const s = stats || ({} as TicketDashboardStats);
  const byStatus = Object.entries(s.ticketsByStatus || {}).reduce<Record<string, number>>((acc, [key, value]) => {
    const normalized = key === "AI_RESOLVED" ? "RESOLVED" : key;
    acc[normalized] = (acc[normalized] || 0) + (Number(value) || 0);
    return acc;
  }, {});
  const byChannel = s.ticketsByChannel || {};
  const byConsumer = s.ticketsByConsumerType || {};
  const byPriority = s.ticketsByPriority || {};
  const total = s.totalTickets ?? 0;

  const channelItems = Object.entries(byChannel)
    .filter(([key]) => !EXCLUDED_CHANNELS.has(key))
    .map(([key, value]) => ({
      key,
      label: CHANNEL_META[key]?.label || key.replace(/_/g, " "),
      color: CHANNEL_META[key]?.color || "#64748b",
      value: Number(value) || 0,
    }))
    .sort((a, b) => b.value - a.value);

  const consumerItems = CONSUMER_TYPES.filter((c) => c.id !== "ADMIN")
    .map((c) => ({
      key: c.id,
      label: c.label,
      color: "#115fd5",
      value: Number(byConsumer[c.id]) || 0,
    }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);

  const priorityItems = ["HIGH", "MEDIUM", "LOW"]
    .map((key) => ({
      key,
      label: PRIORITY_META[key]?.label || key,
      color: PRIORITY_META[key]?.color || "#64748b",
      value: Number(byPriority[key]) || 0,
    }))
    .filter((item) => item.value > 0);

  const statusLegend = STATUS_ORDER.filter((k) => (byStatus[k] || 0) > 0);

  return { s, byStatus, total, channelItems, consumerItems, priorityItems, statusLegend };
}

type Props = {
  stats: TicketDashboardStats | null;
  loading: boolean;
  onBack?: () => void;
};

export function HelpSupportAnalyticsPage({ stats, loading, onBack }: Props) {
  const helpDeskNotifications = useHelpDeskNotifications();

  if (loading && !stats) {
    return (
      <section className="hs-admin-hub hs-admin-hub--analytics-page" aria-label="Analytics">
        <header className="admin-page__hero hs-admin-hub__hero-unified hs-admin-hub__hero--analytics">
          <div className="hs-admin-hub__hero-main">
            <p className="admin-page__eyebrow">Help &amp; Support</p>
            <h1 className="admin-page__title">Analytics</h1>
            <p className="admin-page__subtitle">Loading analytics…</p>
          </div>
        </header>
        <div className="hs-admin-hub__analytics hs-admin-hub__analytics--loading">
          {[1, 2, 3].map((i) => (
            <div key={i} className="hs-admin-hub__panel hs-admin-hub__kpi--skeleton" style={{ minHeight: 220 }} />
          ))}
        </div>
      </section>
    );
  }

  const { s, byStatus, total, statusLegend, channelItems, consumerItems, priorityItems } = buildAnalyticsData(stats);

  return (
    <section className="hs-admin-hub hs-admin-hub--analytics-page" aria-label="Analytics">
      <header className="admin-page__hero hs-admin-hub__hero-unified hs-admin-hub__hero--analytics">
        <div className="hs-admin-hub__hero-main">
          <p className="admin-page__eyebrow">Help &amp; Support</p>
          <h1 className="admin-page__title">Analytics</h1>
          <p className="admin-page__subtitle">
            Ticket volume, channel mix, priorities, and team performance for your support desk.
          </p>
          <div className="hs-admin-hub__hero-chips">
            <span>{s.openTickets ?? 0} open</span>
            <span>{s.pendingTickets ?? 0} pending</span>
            <span>{s.pendingWithUserTickets ?? 0} with user</span>
            <span>{total} total</span>
          </div>
        </div>
        <div className="hs-admin-hub__hero-aside">
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
          {onBack ? (
            <button type="button" className="hs-admin-hub__back-btn" onClick={onBack}>
              <IconArrowLeft size={16} />
              Back to dashboard
            </button>
          ) : null}
          <div className="hs-admin-hub__hero-metric">
            <span>Resolution rate</span>
            <strong>{s.resolutionRatePercent ?? 0}%</strong>
            <IconTrendingUp size={16} />
          </div>
        </div>
      </header>

      <div id="help-desk-analytics" className="hs-admin-hub__analytics" aria-label="Support desk analytics">
        <div className="hs-admin-hub__charts">
          <div className="hs-admin-hub__panel hs-admin-hub__panel--donut">
            <div className="hs-admin-hub__panel-head">
              <h3>Ticket status mix</h3>
              <p>Share of tickets by current status</p>
            </div>
            <div className="hs-admin-hub__donut-wrap">
              <div
                className="hs-admin-hub__donut"
                style={{ background: buildDonutGradient(byStatus) }}
                role="img"
                aria-label={`${total} total tickets by status`}
              >
                <div className="hs-admin-hub__donut-center">
                  <strong>{total}</strong>
                  <span>Total</span>
                </div>
              </div>
              <div className="hs-admin-hub__legend">
                {statusLegend.length === 0 ? (
                  <span className="hs-admin-hub__empty">No tickets yet</span>
                ) : (
                  statusLegend.map((key) => (
                    <span key={key}>
                      <i style={{ background: TICKET_STATUSES.find((x) => x.id === key)?.color }} />
                      {TICKET_STATUSES.find((x) => x.id === key)?.label} ({byStatus[key]})
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          <BarChart
            title="Tickets by channel"
            subtitle="Where customers reach support"
            items={channelItems}
            emptyLabel="No channel data yet — tickets will appear as they arrive."
          />

          <BarChart
            title="Tickets by user type"
            subtitle="Student, institute, industry & more"
            items={consumerItems}
            emptyLabel="No user-type breakdown yet."
          />
        </div>

        <div className="hs-admin-hub__insights">
          <div className="hs-admin-hub__panel">
            <div className="hs-admin-hub__panel-head">
              <h3>Priority queue</h3>
              <p>Workload by urgency level</p>
            </div>
            {priorityItems.length === 0 ? (
              <p className="hs-admin-hub__empty">No priority data yet.</p>
            ) : (
              <div className="hs-admin-hub__priority-grid">
                {priorityItems.map((item) => (
                  <div key={item.key} className="hs-admin-hub__priority-chip" style={{ borderColor: item.color }}>
                    <span style={{ color: item.color }}>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="hs-admin-hub__panel hs-admin-hub__panel--performance">
            <div className="hs-admin-hub__panel-head">
              <h3>Team performance</h3>
              <p>Desk efficiency at a glance</p>
            </div>
            <div className="hs-admin-hub__perf-grid">
              <div className="hs-admin-hub__perf-item">
                <IconClock size={18} />
                <div>
                  <strong>{s.averageResponseTimeHours ?? 0}h</strong>
                  <span>Avg. response time</span>
                </div>
              </div>
              <div className="hs-admin-hub__perf-item">
                <IconStar size={18} />
                <div>
                  <strong>{s.customerSatisfactionScore ?? 0}/5</strong>
                  <span>Customer satisfaction</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
