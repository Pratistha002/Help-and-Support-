"use client";

import { useMemo } from "react";
import { CONSUMER_TYPES } from "@/lib/supportConstants";
import { TICKET_STATUSES, channelLabel, statusColor, statusLabel } from "@/lib/ticketConstants";
import {
  IconCalendar,
  IconChart,
  IconChevronRightSmall,
  IconDownload,
  IconFileText,
  IconFilter,
  IconLoader,
  IconPhone,
  IconPlus,
  IconSearch,
  IconTag,
  IconTicket,
  IconUser,
  IconUserCheck,
} from "./AdminIcons";
import "./status-tracking-tickets.css";
import "./manage-email.css";

const ADMIN_TICKET_STATUS_FILTERS = TICKET_STATUSES.map((s) => s.id);
const ACTIVE_QUEUE_STATUSES = ["OPEN", "IN_PROGRESS", "PENDING", "PENDING_WITH_USER", "ESCALATED"];

function consumerTypeLabel(type?: string): string {
  return CONSUMER_TYPES.find((c) => c.id === type)?.label || type || "—";
}

function ticketUserName(t: any): string {
  return t?.name || t?.userName || "—";
}

function ticketUserEmail(t: any): string {
  return t?.email || t?.userEmail || "";
}

function ticketUserPhone(t: any): string | undefined {
  return t?.phone || t?.userPhone;
}

function ticketAgentName(t: any): string | undefined {
  return t?.assignedAdminName || t?.assignedAgentName;
}

function ticketAgentEmail(t: any): string | undefined {
  return t?.assignedAdminEmail || t?.assignedAgentEmail;
}

function ticketId(t: any): string {
  return String(t._id || t.id);
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

function SubmissionKpi({
  label, value, tone = "primary", highlight = false,
}: { label: string; value: number; tone?: string; highlight?: boolean }) {
  return (
    <div className={`hs-sub-kpi hs-sub-kpi--${tone}${highlight ? " is-highlight" : ""}`}>
      <span className="hs-sub-kpi__value">{value}</span>
      <span className="hs-sub-kpi__label">{label}</span>
    </div>
  );
}

function exportTicketsCsv(tickets: any[]) {
  const headers = ["Ticket ID", "Name", "Email", "Phone", "Type", "Channel", "Category", "Priority", "Subject", "Status", "Agent", "Created"];
  const escape = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = tickets.map((t) => [
    t.ticketNumber,
    ticketUserName(t),
    ticketUserEmail(t),
    ticketUserPhone(t) || "",
    consumerTypeLabel(t.consumerType),
    channelLabel(t.channel),
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
  a.download = `status-tracking-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function ticketAssignedToAgent(ticket: any, agentId?: string, agentEmail?: string) {
  const id = ticket?.assignedAdminId || ticket?.assignedAgentId;
  const email = (ticket?.assignedAdminEmail || ticket?.assignedAgentEmail || "").toLowerCase();
  if (agentId && id && String(id) === String(agentId)) return true;
  if (agentEmail && email && email === agentEmail.toLowerCase()) return true;
  return false;
}

function ticketNeedsAccept(ticket: any) {
  return !ticket?.assignedAdminId && !ticket?.assignedAgentId
    && !ticket?.assignedAdminEmail && !ticket?.assignedAgentEmail;
}

type Props = {
  allTickets: any[];
  tickets: any[];
  loading: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusFilter: (v: string) => void;
  typeFilter: string;
  onTypeFilter: (v: string) => void;
  ageFilter: string;
  onAgeFilterChange: (v: string) => void;
  viewAllTickets: boolean;
  onViewAllTickets: () => void;
  onShowAnalytics: () => void;
  onSelect: (t: any) => void;
  onAccept: (id: string) => void;
  acceptingTicketId: string | null;
  agentId?: string;
  agentEmail?: string;
};

export function StatusTrackingTicketsPanel({
  allTickets,
  tickets,
  loading,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilter,
  typeFilter,
  onTypeFilter,
  ageFilter,
  onAgeFilterChange,
  viewAllTickets,
  onViewAllTickets,
  onShowAnalytics,
  onSelect,
  onAccept,
  acceptingTicketId,
  agentId,
  agentEmail,
}: Props) {
  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter((t) => {
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
        channelLabel(t.channel),
        t.channel,
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [tickets, search]);

  const panelOpenCount = useMemo(
    () => searched.filter((t) => ACTIVE_QUEUE_STATUSES.includes(t.status)).length,
    [searched],
  );

  const highPriorityCount = useMemo(
    () => searched.filter((t) => ["HIGH", "URGENT"].includes(String(t.priority || "").toUpperCase())).length,
    [searched],
  );

  const resolvedCount = useMemo(
    () => searched.filter((t) => ["CLOSED", "RESOLVED"].includes(t.status)).length,
    [searched],
  );

  const quickStatuses = useMemo(() => {
    const counts = allTickets.reduce<Record<string, number>>((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {});
    return [
      { key: "", label: "All", count: allTickets.length },
      ...ADMIN_TICKET_STATUS_FILTERS.map((s) => ({
        key: s,
        label: TICKET_STATUSES.find((x) => x.id === s)?.label || s,
        count: counts[s] || 0,
      })),
    ];
  }, [allTickets]);

  const renderAcceptCell = (t: any) => {
    if (["RESOLVED", "CLOSED"].includes(t.status)) {
      return <span className="hs-ticket-accept-muted">—</span>;
    }
    if (!ticketNeedsAccept(t)) {
      const isMe = ticketAssignedToAgent(t, agentId, agentEmail);
      const name = ticketAgentName(t) || "Assigned";
      const email = ticketAgentEmail(t);
      return (
        <span className={`hs-ticket-accept-assignee${isMe ? " hs-ticket-accept-assignee--mine" : ""}`} title={email || name}>
          <IconUserCheck size={12} />
          <span className="hs-ticket-accept-assignee__text">
            <span className="hs-ticket-accept-assignee__name">{name}</span>
            {email && <span className="hs-ticket-accept-assignee__email">{email}</span>}
            {isMe && <span className="hs-ticket-accept-assignee__you">You</span>}
          </span>
        </span>
      );
    }
    return (
      <button
        type="button"
        className="hs-ticket-accept-btn hs-ticket-accept-btn--primary"
        disabled={acceptingTicketId === ticketId(t)}
        onClick={(e) => {
          e.stopPropagation();
          onAccept(ticketId(t));
        }}
      >
        <IconPlus size={13} />
        Accept
      </button>
    );
  };

  const panelTitle = viewAllTickets ? "All tickets — full data" : "All tickets";

  return (
    <div className="hs-tracking-panel-wrap hs-panel">
      <div className="hs-tracking-panel">
        <div className="hs-tracking-panel__hero">
          <div className="hs-tracking-panel__hero-main">
            <div className="hs-tracking-panel__hero-icon" aria-hidden>
              <IconTicket size={22} />
            </div>
            <div>
              <h2>{panelTitle}</h2>
              {!loading && (
                <p className="hs-panel__head-sub">
                  {searched.length} of {allTickets.length} shown
                  {!statusFilter && panelOpenCount > 0 && ` · ${panelOpenCount} need attention`}
                  {viewAllTickets ? " · Full customer & ticket data" : " · Use View to open details"}
                </p>
              )}
            </div>
          </div>
          <div className="hs-tracking-panel__hero-actions">
            {!viewAllTickets ? (
              <button type="button" className="hs-tracking-panel__cta" onClick={onViewAllTickets}>
                <IconFileText size={16} />
                Full data view
              </button>
            ) : (
              <button type="button" className="hs-tracking-panel__cta hs-tracking-panel__cta--ghost" onClick={onShowAnalytics}>
                <IconChart size={16} />
                Show analytics
              </button>
            )}
          </div>
        </div>

        {!loading && (
          <div className="hs-tracking-panel__kpis">
            <SubmissionKpi label="In list" value={searched.length} tone="primary" />
            <SubmissionKpi label="Open" value={panelOpenCount} tone="warning" highlight={panelOpenCount > 0} />
            <SubmissionKpi label="High priority" value={highPriorityCount} tone="danger" highlight={highPriorityCount > 0} />
            <SubmissionKpi label="Resolved" value={resolvedCount} tone="success" />
          </div>
        )}

        <div className="hs-tracking-panel__controls">
          <div className="hs-tracking-panel__search">
            <IconSearch size={16} />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search ticket ID, user, channel, problem…"
              aria-label="Search tickets"
            />
          </div>
          <div className="hs-tracking-panel__filters">
            <label className="hs-tracking-panel__filter">
              <IconFilter size={14} />
              <select value={statusFilter} onChange={(e) => onStatusFilter(e.target.value)} aria-label="Filter by status">
                <option value="">All statuses</option>
                {ADMIN_TICKET_STATUS_FILTERS.map((s) => (
                  <option key={s} value={s}>{TICKET_STATUSES.find((x) => x.id === s)?.label}</option>
                ))}
              </select>
            </label>
            <label className="hs-tracking-panel__filter">
              <IconTag size={14} />
              <select value={typeFilter} onChange={(e) => onTypeFilter(e.target.value)} aria-label="Filter by user type">
                <option value="">All types</option>
                {CONSUMER_TYPES.filter((c) => c.id !== "ADMIN").map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </label>
            <label className="hs-tracking-panel__filter">
              <IconCalendar size={14} />
              <select value={ageFilter} onChange={(e) => onAgeFilterChange(e.target.value)} aria-label="Filter by age">
                <option value="">Any age</option>
                <option value="today">Today</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
              </select>
            </label>
            <button type="button" className="hs-ticket-export-btn" onClick={() => exportTicketsCsv(searched)} disabled={!searched.length}>
              <IconDownload size={14} />
              Export CSV
            </button>
          </div>
        </div>

        {!loading && (
          <div className="hs-tracking-panel__chips" role="group" aria-label="Quick status filters">
            {quickStatuses.map(({ key, label, count }) => (
              <button
                key={key || "all"}
                type="button"
                className={`hs-tracking-chip${statusFilter === key ? " is-active" : ""}${key === "ESCALATED" && count > 0 ? " hs-tracking-chip--warn" : ""}`}
                onClick={() => onStatusFilter(key)}
              >
                {label}
                <span className="hs-tracking-chip__count">{count}</span>
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="hs-tracking-panel__loading">
            <IconLoader size={22} />
            Loading tickets…
          </div>
        ) : searched.length === 0 ? (
          <div className="hs-submissions-empty">
            <h3>No tickets found</h3>
            <p>Try adjusting your search or filters.</p>
          </div>
        ) : viewAllTickets ? (
          <div className="hs-table-wrap hs-table-wrap--full hs-submissions-table-wrap">
            <table className="hs-table hs-table--full hs-submissions-table">
              <thead>
                <tr>
                  {["Ticket ID", "Name", "Email", "Phone", "User type", "Channel", "Category", "Priority", "Subject", "Message", "Status", "Created", "Assigned to", "Actions"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {searched.map((t) => (
                  <tr key={ticketId(t)}>
                    <td><span className="hs-sub-ticket-id">{t.ticketNumber}</span></td>
                    <td>{ticketUserName(t)}</td>
                    <td>{ticketUserEmail(t) || "—"}</td>
                    <td>{ticketUserPhone(t) || "—"}</td>
                    <td>{consumerTypeLabel(t.consumerType)}</td>
                    <td>{channelLabel(t.channel)}</td>
                    <td>{t.category || "—"}</td>
                    <td><span className={`hs-sub-priority hs-sub-priority--${priorityTone(t.priority)}`}>{t.priority || "—"}</span></td>
                    <td>{t.subject || "—"}</td>
                    <td className="hs-sub-problem__desc">{t.description || "—"}</td>
                    <td><StatusBadge status={t.status} /></td>
                    <td className="hs-sub-date">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "—"}</td>
                    <td className="hs-table__accept">{renderAcceptCell(t)}</td>
                    <td className="hs-table__action">
                      <button type="button" className="hs-sub-view-btn" onClick={() => onSelect(t)}>
                        View
                        <IconChevronRightSmall size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="hs-submissions-table-wrap">
            <table className="hs-submissions-table">
              <thead>
                <tr>
                  {["Ticket", "User", "Type", "Channel", "Category", "Priority", "Problem", "Status", "Agent", "Created", "Actions"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {searched.map((t) => {
                  const initial = (ticketUserName(t) || ticketUserEmail(t) || "?").charAt(0).toUpperCase();
                  const channelKey = (t.channel || "unknown").toLowerCase();
                  const agentName = ticketAgentName(t);
                  const agentEmail = ticketAgentEmail(t);
                  return (
                    <tr key={ticketId(t)}>
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
                        <span className={`hs-sub-channel hs-sub-channel--${channelKey}`}>
                          {channelLabel(t.channel)}
                        </span>
                      </td>
                      <td>
                        <div className="hs-sub-category">
                          <span>{t.category || "—"}</span>
                          {t.issueTypeLabel && <span className="hs-sub-category__issue">{t.issueTypeLabel}</span>}
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
                        {ticketUserPhone(t) && (
                          <div className="hs-sub-problem__phone">
                            <IconPhone size={12} />
                            {ticketUserPhone(t)}
                          </div>
                        )}
                      </td>
                      <td><StatusBadge status={t.status} /></td>
                      <td className="hs-sub-agent-cell">
                        {agentName || agentEmail ? (
                          <span className="hs-sub-agent hs-sub-agent--assigned">
                            <IconUser size={12} />
                            <span className="hs-sub-agent__text">
                              <span className="hs-sub-agent__name">{agentName || "—"}</span>
                              {agentEmail && <span className="hs-sub-agent__email">{agentEmail}</span>}
                            </span>
                          </span>
                        ) : (
                          <span className="hs-sub-agent hs-sub-agent--none">Unassigned</span>
                        )}
                      </td>
                      <td className="hs-sub-date">
                        {t.createdAt
                          ? new Date(t.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                          : "—"}
                      </td>
                      <td className="hs-table__action">
                        <div className="hs-ticket-row-actions hs-ticket-row-actions--combined">
                          {renderAcceptCell(t)}
                          <button type="button" className="hs-sub-view-btn" onClick={() => onSelect(t)}>
                            View
                            <IconChevronRightSmall size={14} />
                          </button>
                        </div>
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
  );
}
