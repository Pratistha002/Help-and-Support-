"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { TICKET_STATUSES } from "@/lib/ticketConstants";
import type { TicketDashboardStats } from "@/lib/ticketDashboardStats";
import {
  IconChart,
  IconCheckCircle,
  IconClock,
  IconFileText,
  IconLoader,
  IconTicket,
  IconUser,
} from "./AdminIcons";
import "./status-tracking-dashboard.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const STATUS_CHART_COLORS: Record<string, string> = {
  OPEN: "#3b82f6",
  IN_PROGRESS: "#8b5cf6",
  PENDING: "#f59e0b",
  PENDING_WITH_USER: "#0891b2",
  ESCALATED: "#ef4444",
  RESOLVED: "#10b981",
  CLOSED: "#6b7280",
};

const ADMIN_TICKET_STATUS_FILTERS = TICKET_STATUSES.map((s) => s.id);

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  color,
  sub,
  onClick,
  active,
  filterTitle,
}: {
  icon: typeof IconTicket;
  label: string;
  value: number | string;
  suffix?: string;
  color: string;
  sub?: string;
  onClick?: () => void;
  active?: boolean;
  filterTitle?: string;
}) {
  const className = `hs-analytics-stat${onClick ? " hs-analytics-stat--clickable" : ""}${active ? " is-active" : ""}`;
  const content = (
    <>
      <div className="hs-analytics-stat__icon">
        <Icon size={20} />
      </div>
      <div>
        <p className="hs-analytics-stat__value">{value}{suffix || ""}</p>
        <p className="hs-analytics-stat__label">{label}</p>
        {sub && <p className="hs-analytics-stat__sub">{sub}</p>}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        style={{ "--stat-accent": color } as React.CSSProperties}
        onClick={onClick}
        title={filterTitle}
        aria-pressed={active}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={className} style={{ "--stat-accent": color } as React.CSSProperties}>
      {content}
    </div>
  );
}

type Props = {
  stats: TicketDashboardStats | null;
  loading: boolean;
  onStatusFilter?: (status: string) => void;
  activeStatusFilter?: string;
  onViewTickets?: () => void;
};

export function StatusTrackingDashboard({
  stats,
  loading,
  onStatusFilter,
  activeStatusFilter = "",
  onViewTickets,
}: Props) {
  if (loading) {
    return (
      <div className="hs-analytics hs-analytics--loading">
        <IconLoader size={28} />
        <span>Loading ticket analytics…</span>
      </div>
    );
  }

  if (!stats) return null;

  const byStatus = Object.entries(stats.ticketsByStatus || {}).reduce<Record<string, number>>(
    (acc, [key, value]) => {
      const normalized = key === "AI_RESOLVED" ? "RESOLVED" : key;
      acc[normalized] = (acc[normalized] || 0) + (Number(value) || 0);
      return acc;
    },
    {},
  );

  const statusLabels = Object.keys(byStatus).map(
    (s) => TICKET_STATUSES.find((x) => x.id === s)?.label || s.replace(/_/g, " "),
  );
  const statusValues = Object.values(byStatus);
  const statusColors = Object.keys(byStatus).map((s) => STATUS_CHART_COLORS[s] || "#94a3b8");

  const consumerEntries = Object.entries(stats.ticketsByConsumerType || {}).filter(([key]) => key !== "ADMIN");
  const priorityEntries = Object.entries(stats.ticketsByPriority || {}).filter(([key]) => key !== "URGENT");
  const priorityColors: Record<string, string> = { LOW: "#94a3b8", MEDIUM: "#3b82f6", HIGH: "#f59e0b" };

  const activeTickets =
    stats.openTickets +
    stats.inProgressTickets +
    stats.pendingTickets +
    stats.pendingWithUserTickets +
    stats.escalatedTickets;

  const statusChipCounts: Record<string, number> = {
    "": stats.totalTickets,
    OPEN: stats.openTickets,
    IN_PROGRESS: stats.inProgressTickets,
    PENDING: stats.pendingTickets,
    PENDING_WITH_USER: stats.pendingWithUserTickets,
    ESCALATED: stats.escalatedTickets,
    RESOLVED: stats.resolvedTickets,
    CLOSED: byStatus.CLOSED ?? 0,
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } },
      x: { grid: { display: false } },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "62%",
    plugins: {
      legend: { position: "bottom" as const, labels: { boxWidth: 12, padding: 14, font: { size: 11 } } },
    },
  };

  return (
    <div className="hs-analytics">
      <div className="hs-analytics__hero">
        <div className="hs-analytics__hero-main">
          <div className="hs-analytics__hero-icon" aria-hidden>
            <IconChart size={22} />
          </div>
          <div>
            <h2 className="hs-analytics__title">Support desk overview</h2>
            <p className="hs-analytics__subtitle">
              Real-time ticket volume, status breakdown, and resolution metrics across all channels
            </p>
          </div>
        </div>
        <div className="hs-analytics__header-actions">
          <div className="hs-analytics__resolution">
            <IconChart size={18} />
            <span>
              <strong>{stats.resolutionRatePercent}%</strong>
              <span className="hs-analytics__resolution-label">resolution rate</span>
            </span>
          </div>
          {onViewTickets && (
            <button type="button" className="hs-analytics__cta" onClick={onViewTickets}>
              <IconFileText size={16} />
              Full data view
            </button>
          )}
        </div>
      </div>

      <div className="hs-analytics-stats hs-analytics-stats--primary">
        <StatCard
          icon={IconTicket}
          label="Total tickets"
          value={stats.totalTickets}
          color="#3170a5"
          onClick={onStatusFilter ? () => onStatusFilter("") : undefined}
          active={activeStatusFilter === ""}
          filterTitle="Show all tickets"
        />
        <StatCard
          icon={IconUser}
          label="Active queue"
          value={activeTickets}
          color="#0d9488"
          sub="Open + in progress + pending + pending with user + escalated"
        />
        <StatCard
          icon={IconCheckCircle}
          label="Resolved"
          value={stats.resolvedTickets}
          color="#10b981"
          sub="Closed & fixed"
          onClick={onStatusFilter ? () => onStatusFilter("RESOLVED") : undefined}
          active={activeStatusFilter === "RESOLVED"}
          filterTitle="Show resolved tickets"
        />
        <StatCard
          icon={IconClock}
          label="Avg resolution"
          value={stats.averageResponseTimeHours ?? "—"}
          suffix={stats.averageResponseTimeHours != null ? "h" : ""}
          color="#6366f1"
          sub="Time to close"
        />
      </div>

      {onStatusFilter && (
        <div className="hs-analytics-status-chips" role="group" aria-label="Filter by status">
          <span className="hs-analytics-status-chips__label">Filter by status</span>
          <div className="hs-analytics-status-chips__row">
            <button
              type="button"
              className={`hs-analytics-chip${activeStatusFilter === "" ? " is-active" : ""}`}
              onClick={() => onStatusFilter("")}
            >
              All
              <span className="hs-analytics-chip__count">{statusChipCounts[""]}</span>
            </button>
            {ADMIN_TICKET_STATUS_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                className={`hs-analytics-chip${activeStatusFilter === s ? " is-active" : ""}${s === "ESCALATED" && (statusChipCounts[s] ?? 0) > 0 ? " hs-analytics-chip--warn" : ""}`}
                onClick={() => onStatusFilter(s)}
              >
                {TICKET_STATUSES.find((x) => x.id === s)?.label || s}
                <span className="hs-analytics-chip__count">{statusChipCounts[s] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="hs-analytics-charts">
        <div className="hs-analytics-chart hs-analytics-chart--wide">
          <div className="hs-analytics-chart__head">
            <h3>Ticket pipeline</h3>
            <p className="hs-analytics-chart__desc">How tickets flow from open to resolved</p>
          </div>
          <div className="hs-analytics-chart__canvas">
            <Bar
              data={{
                labels: ["Open", "In Progress", "Pending", "Pending with User", "Escalated", "Resolved"],
                datasets: [{
                  label: "Ticket pipeline",
                  data: [
                    stats.openTickets,
                    stats.inProgressTickets,
                    stats.pendingTickets,
                    stats.pendingWithUserTickets,
                    stats.escalatedTickets,
                    stats.resolvedTickets,
                  ],
                  backgroundColor: ["#3b82f6", "#8b5cf6", "#f59e0b", "#0891b2", "#ef4444", "#10b981"],
                  borderRadius: 6,
                }],
              }}
              options={{
                ...chartOptions,
                indexAxis: "y" as const,
                scales: {
                  x: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } },
                  y: { grid: { display: false } },
                },
              }}
            />
          </div>
        </div>

        <div className="hs-analytics-chart">
          <div className="hs-analytics-chart__head">
            <h3>By status</h3>
            <p className="hs-analytics-chart__desc">Share of all tickets per status</p>
          </div>
          <div className="hs-analytics-chart__canvas hs-analytics-chart__canvas--donut">
            <Doughnut
              data={{
                labels: statusLabels,
                datasets: [{ data: statusValues, backgroundColor: statusColors, borderWidth: 0, hoverOffset: 6 }],
              }}
              options={doughnutOptions}
            />
          </div>
        </div>

        <div className="hs-analytics-chart">
          <div className="hs-analytics-chart__head">
            <h3>By user type</h3>
            <p className="hs-analytics-chart__desc">Student, institute, industry, etc.</p>
          </div>
          <div className="hs-analytics-chart__canvas">
            <Bar
              data={{
                labels: consumerEntries.map(([k]) => k.replace(/_/g, " ")),
                datasets: [{
                  label: "Tickets",
                  data: consumerEntries.map(([, v]) => v),
                  backgroundColor: "#3170a5",
                  borderRadius: 8,
                  maxBarThickness: 48,
                }],
              }}
              options={chartOptions}
            />
          </div>
        </div>

        <div className="hs-analytics-chart">
          <div className="hs-analytics-chart__head">
            <h3>By priority</h3>
            <p className="hs-analytics-chart__desc">Low to high workload</p>
          </div>
          <div className="hs-analytics-chart__canvas">
            <Bar
              data={{
                labels: priorityEntries.map(([k]) => k),
                datasets: [{
                  label: "Tickets",
                  data: priorityEntries.map(([, v]) => v),
                  backgroundColor: priorityEntries.map(([k]) => priorityColors[k] || "#64748b"),
                  borderRadius: 8,
                  maxBarThickness: 40,
                }],
              }}
              options={chartOptions}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
