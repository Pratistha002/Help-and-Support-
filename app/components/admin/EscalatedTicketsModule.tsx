"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { supportApi } from "@/lib/supportApi";
import { statusColor, statusLabel } from "@/lib/ticketConstants";
import { TechnicalEscalationPanel } from "./TechnicalEscalationPanel";
import { TechnicalTeamCard, TechnicalTeamManageSection } from "./TechnicalTeamManageSection";
import {
  IconAlertCircle,
  IconChevronRight,
  IconDownload,
  IconFilter,
  IconLoader,
  IconSearch,
  IconSettings,
  IconTicket,
  IconUser,
  IconUserCheck,
  IconUserX,
  IconUsers,
  IconX,
  IconZap,
} from "./AdminIcons";
import "./escalated-tickets.css";

const UNASSIGNED_FILTER = "__unassigned__";

const ESCALATED_TABS = [
  { id: "tickets", label: "Escalated tickets", icon: IconTicket, tone: "rose", badgeKey: "tickets" as const },
  { id: "technical-team", label: "Technical team", icon: IconUsers, tone: "indigo", badgeKey: "team" as const },
  { id: "manage-team", label: "Manage team", icon: IconSettings, tone: "violet" },
];

function ticketId(t: any) {
  return String(t._id || t.id);
}

function ticketUserName(t: any) {
  return t.name || t.userName || "—";
}

function ticketUserEmail(t: any) {
  return t.email || t.userEmail || "—";
}

function formatTicketDate(value?: string | Date | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "2-digit",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function priorityTone(priority?: string) {
  const map: Record<string, string> = { URGENT: "urgent", HIGH: "high", MEDIUM: "medium", LOW: "low" };
  return map[priority || ""] || "low";
}

function PriorityBadge({ priority }: { priority?: string }) {
  if (!priority) return <span className="hs-escalated-priority hs-escalated-priority--none">—</span>;
  return (
    <span className={`hs-escalated-priority hs-escalated-priority--${priorityTone(priority)}`}>
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = statusColor(status);
  return (
    <span className="hs-status-badge" style={{ color, background: `${color}18`, borderColor: `${color}40` }}>
      {statusLabel(status)}
    </span>
  );
}

function EscalatedKpiCard({
  icon: Icon,
  label,
  value,
  tone = "primary",
  highlight = false,
}: {
  icon: typeof IconTicket;
  label: string;
  value: number;
  tone?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`hs-escalated-kpi hs-escalated-kpi--${tone}${highlight ? " is-highlight" : ""}`}>
      <div className="hs-escalated-kpi__icon" aria-hidden>
        <Icon size={18} />
      </div>
      <div>
        <p className="hs-escalated-kpi__value">{value}</p>
        <p className="hs-escalated-kpi__label">{label}</p>
      </div>
    </div>
  );
}

function exportTicketsCsv(tickets: any[]) {
  const headers = ["Ticket ID", "Customer", "Email", "Subject", "Assigned to", "Designation", "Priority", "Escalated", "Status"];
  const escape = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = tickets.map((t) => [
    t.ticketNumber,
    ticketUserName(t),
    ticketUserEmail(t),
    t.subject || "",
    t.assignedTechnicalMemberName || "Unassigned",
    t.assignedTechnicalMemberDesignation || "",
    t.priority || "",
    t.escalatedAt ? new Date(t.escalatedAt).toISOString() : "",
    statusLabel(t.status),
  ]);
  const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `escalated-tickets-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function EscalatedAssignDrawer({
  open,
  ticket,
  onClose,
  onAssigned,
}: {
  open: boolean;
  ticket: any | null;
  onClose: () => void;
  onAssigned: (data: any) => void;
}) {
  if (!open || !ticket || typeof document === "undefined") return null;

  return createPortal(
    <div className="hs-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="hs-modal hs-modal--escalated"
        role="dialog"
        aria-modal="true"
        aria-labelledby="escalated-assign-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="hs-modal__head">
          <div>
            <p className="hs-modal__eyebrow">{ticket.ticketNumber}</p>
            <h2 id="escalated-assign-title">{ticket.subject || "Escalated ticket"}</h2>
            <p className="hs-modal__sub">
              {ticketUserName(ticket)} · {ticketUserEmail(ticket)}
            </p>
          </div>
          <button type="button" className="hs-modal__close" onClick={onClose} aria-label="Close">
            <IconX size={18} />
          </button>
        </header>
        <div className="hs-modal__body">
          <div className="hs-escalated-drawer__meta">
            <p><strong>Description</strong></p>
            <p>{ticket.description?.trim() || "No description provided."}</p>
            {ticket.priority ? <p><strong>Priority:</strong> {ticket.priority}</p> : null}
            <p><strong>Escalated:</strong> {formatTicketDate(ticket.escalatedAt || ticket.updatedAt)}</p>
          </div>
          <TechnicalEscalationPanel ticket={ticket} onAssigned={onAssigned} onCancel={onClose} />
        </div>
      </div>
    </div>,
    document.body,
  );
}

function EscalatedTicketTable({
  tickets,
  selectedId,
  onSelect,
  onAssignUnassigned,
}: {
  tickets: any[];
  selectedId: string | null;
  onSelect: (t: any) => void;
  onAssignUnassigned: (t: any, e: React.MouseEvent) => void;
}) {
  if (!tickets.length) {
    return (
      <div className="hs-escalated-empty">
        <div className="hs-escalated-empty__icon" aria-hidden>
          <IconTicket size={28} />
        </div>
        <h3>No escalated tickets found</h3>
        <p>Try adjusting your search or filter — or check back when new tickets are escalated.</p>
      </div>
    );
  }

  return (
    <div className="hs-table-wrap hs-table-wrap--full hs-escalated-table-wrap">
      <table className="hs-table hs-table--clickable hs-table--full hs-escalated-table">
        <colgroup>
          <col className="hs-esc-col-id" />
          <col className="hs-esc-col-customer" />
          <col className="hs-esc-col-subject" />
          <col className="hs-esc-col-assignee" />
          <col className="hs-esc-col-priority" />
          <col className="hs-esc-col-when" />
          <col className="hs-esc-col-status" />
          <col className="hs-esc-col-action" />
        </colgroup>
        <thead>
          <tr>
            {["Ticket", "Customer", "Subject", "Assigned to", "Priority", "Escalated", "Status", "Action"].map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => {
            const id = ticketId(t);
            const unassigned = !t.assignedTechnicalMemberId;
            const name = ticketUserName(t);
            const email = ticketUserEmail(t);
            const initial = (name || "?").charAt(0).toUpperCase();
            const assignee = t.assignedTechnicalMemberName || "";
            const designation = t.assignedTechnicalMemberDesignation || "";
            return (
              <tr
                key={id}
                className={[selectedId === id ? "is-selected" : "", unassigned ? "hs-escalated-row--unassigned" : ""].filter(Boolean).join(" ")}
                onClick={() => onSelect(t)}
                title="Click to view details & assign team"
              >
                <td>
                  <span className="hs-escalated-ticket-id">{t.ticketNumber}</span>
                </td>
                <td>
                  <div className="hs-escalated-customer">
                    <span className="hs-escalated-customer__avatar" aria-hidden>{initial}</span>
                    <div className="hs-escalated-customer__meta">
                      <div className="hs-escalated-customer__name" title={name}>{name}</div>
                      {email && email !== "—" ? (
                        <div className="hs-escalated-customer__email" title={email}>{email}</div>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td>
                  <span className="hs-escalated-subject" title={t.subject || undefined}>
                    {t.subject || "—"}
                  </span>
                </td>
                <td>
                  {assignee ? (
                    <div className="hs-escalated-assignee-block" title={designation ? `${assignee} · ${designation}` : assignee}>
                      <span className="hs-escalated-assignee">
                        <IconUser size={13} aria-hidden />
                        <span className="hs-escalated-assignee__name">{assignee}</span>
                      </span>
                      {designation ? (
                        <span className="hs-escalated-designation">{designation}</span>
                      ) : null}
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="hs-escalated-unassigned hs-escalated-unassigned--btn"
                      onClick={(e) => onAssignUnassigned(t, e)}
                      title="Assign to technical team"
                    >
                      <IconUserX size={12} aria-hidden />
                      Unassigned
                    </button>
                  )}
                </td>
                <td><PriorityBadge priority={t.priority} /></td>
                <td className="hs-escalated-when">
                  {formatTicketDate(t.escalatedAt || t.updatedAt)}
                </td>
                <td><StatusBadge status={t.status} /></td>
                <td className="hs-table__action" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className={`hs-escalated-view-btn${unassigned ? " hs-escalated-view-btn--assign" : ""}`}
                    onClick={() => onSelect(t)}
                  >
                    {unassigned ? "Assign" : "View"}
                    <IconChevronRight size={14} aria-hidden />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TechnicalTeamRoster({ members, loading }: { members: any[]; loading: boolean }) {
  const activeMembers = members.filter((m) => m.active !== false);

  if (loading) {
    return (
      <div className="hs-tech-escalation--loading">
        <IconLoader size={20} className="animate-spin" />
        <span>Loading technical team…</span>
      </div>
    );
  }

  if (!activeMembers.length) {
    return (
      <div className="hs-tech-empty">
        <div className="hs-tech-empty__icon" aria-hidden>
          <IconUsers size={28} />
        </div>
        <h3>No technical team members yet</h3>
        <p>Go to <strong>Manage team</strong> to add specialists who receive escalated tickets.</p>
      </div>
    );
  }

  return (
    <div className="hs-escalated-roster">
      <div className="hs-escalated-roster__banner">
        <IconUsers size={18} aria-hidden />
        <p>
          <strong>{activeMembers.length}</strong> active specialist{activeMembers.length === 1 ? "" : "s"} ready for escalated ticket assignments.
        </p>
      </div>
      <ul className="hs-escalated-roster__grid">
        {activeMembers.map((m) => (
          <li key={m.id}>
            <TechnicalTeamCard member={m} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EscalatedTicketsModule() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab = ESCALATED_TABS.some((t) => t.id === tabParam) ? tabParam! : "tickets";

  const setTab = (nextTab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("module", "escalated-tickets");
    if (nextTab === "tickets") params.delete("tab");
    else params.set("tab", nextTab);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [actionStatus, setActionStatus] = useState("");

  const loadTickets = useCallback(() => {
    setLoading(true);
    supportApi.adminTickets({ status: "ESCALATED" })
      .then((data) => setTickets(Array.isArray(data) ? data : []))
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  }, []);

  const loadMembers = useCallback(() => {
    setMembersLoading(true);
    supportApi.adminTechnicalTeamAll()
      .then((data) => setMembers(Array.isArray(data) ? data : []))
      .catch(() => setMembers([]))
      .finally(() => setMembersLoading(false));
  }, []);

  useEffect(() => { void loadTickets(); }, [loadTickets]);
  useEffect(() => { void loadMembers(); }, [loadMembers]);

  const assigneeOptions = useMemo(() => {
    const fromTickets = new Map<string, string>();
    tickets.forEach((t) => {
      if (t.assignedTechnicalMemberId && t.assignedTechnicalMemberName) {
        fromTickets.set(t.assignedTechnicalMemberId, t.assignedTechnicalMemberName);
      }
    });
    members.filter((m) => m.active !== false).forEach((m) => {
      fromTickets.set(m.id, m.name);
    });
    return Array.from(fromTickets.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tickets, members]);

  const filteredTickets = useMemo(() => {
    let list = tickets;
    if (assigneeFilter === UNASSIGNED_FILTER) {
      list = list.filter((t) => !t.assignedTechnicalMemberId);
    } else if (assigneeFilter) {
      list = list.filter((t) => t.assignedTechnicalMemberId === assigneeFilter);
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((t) => {
      const haystack = [t.ticketNumber, ticketUserName(t), ticketUserEmail(t), t.subject, t.assignedTechnicalMemberName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [tickets, assigneeFilter, searchQuery]);

  const unassignedCount = useMemo(() => tickets.filter((t) => !t.assignedTechnicalMemberId).length, [tickets]);
  const assignedCount = filteredTickets.filter((t) => t.assignedTechnicalMemberId).length;
  const urgentCount = useMemo(() => filteredTickets.filter((t) => t.priority === "URGENT").length, [filteredTickets]);
  const activeTeamCount = members.filter((m) => m.active !== false).length;

  const tabBadges = {
    tickets: !loading && tickets.length > 0 ? tickets.length : null,
    team: !membersLoading && activeTeamCount > 0 ? activeTeamCount : null,
  };

  const openAssign = (t: any) => {
    setSelectedTicket(t);
    setAssignOpen(true);
    setActionStatus("");
  };

  const handleAssigned = (data: any) => {
    const updated = data?.ticket;
    if (updated) {
      setTickets((prev) => prev.map((t) => (ticketId(t) === ticketId(updated) ? { ...t, ...updated } : t)));
      setSelectedTicket((prev: any | null) => (prev && ticketId(prev) === ticketId(updated) ? { ...prev, ...updated } : prev));
    } else {
      loadTickets();
    }
    const parts = [data?.message || "Ticket assigned."];
    if (data?.emailSent) parts.push("Email sent.");
    if (data?.smsSent) parts.push("SMS sent.");
    setActionStatus(parts.join(" "));
    if (data?.emailSent || data?.smsSent) {
      setTimeout(() => setAssignOpen(false), 1200);
    }
  };

  const handleMembersChanged = () => {
    loadMembers();
    loadTickets();
  };

  return (
    <div className="hs-escalated-section">
      {actionStatus && !assignOpen ? <p className="admin-action-status">{actionStatus}</p> : null}

      <nav className="hs-escalated-nav" aria-label="Escalated tickets sections">
        <div className="hs-escalated-nav__inner">
          <div className="hs-escalated-nav__tabs">
            {ESCALATED_TABS.map(({ id, label, icon: Icon, tone, badgeKey }) => {
              const badge = badgeKey ? tabBadges[badgeKey] : null;
              const isActive = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  className={`hs-escalated-nav__tab hs-escalated-nav__tab--${tone}${isActive ? " is-active" : ""}`}
                  onClick={() => setTab(id)}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="hs-escalated-nav__tab-icon" aria-hidden>
                    <Icon size={14} />
                  </span>
                  <span className="hs-escalated-nav__tab-label">{label}</span>
                  {badge != null ? <span className="hs-escalated-nav__badge">{badge}</span> : null}
                </button>
              );
            })}
          </div>
          <div className="hs-escalated-nav__summary">
            {!loading && tab === "tickets" && unassignedCount > 0 ? (
              <span className="hs-escalated-nav__pill hs-escalated-nav__pill--warn">{unassignedCount} unassigned</span>
            ) : null}
            {!membersLoading && activeTeamCount > 0 ? (
              <span className="hs-escalated-nav__pill hs-escalated-nav__pill--team">
                {activeTeamCount} specialist{activeTeamCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
        </div>
      </nav>

      {tab === "tickets" && (
        <div className="hs-panel hs-panel--list hs-panel--full hs-escalated-panel">
          <div className="hs-escalated-panel__hero">
            <div className="hs-escalated-panel__hero-main">
              <div className="hs-escalated-panel__hero-icon" aria-hidden>
                <IconAlertCircle size={22} />
              </div>
              <div>
                <h2>Escalated tickets</h2>
                {!loading && (
                  <p className="hs-panel__head-sub">
                    {filteredTickets.length} of {tickets.length} shown
                    {unassignedCount > 0 && ` · ${unassignedCount} need assignment`}
                    {" · Click a row to assign team"}
                  </p>
                )}
              </div>
            </div>
          </div>

          {!loading && (
            <div className="hs-escalated-kpis">
              <EscalatedKpiCard icon={IconTicket} label="Total escalated" value={filteredTickets.length} tone="rose" />
              <EscalatedKpiCard icon={IconUserX} label="Unassigned" value={unassignedCount} tone="warning" highlight={unassignedCount > 0} />
              <EscalatedKpiCard icon={IconUserCheck} label="Assigned" value={assignedCount} tone="success" />
              <EscalatedKpiCard icon={IconZap} label="Urgent priority" value={urgentCount} tone="danger" highlight={urgentCount > 0} />
            </div>
          )}

          <div className="hs-escalated-controls">
            <div className="hs-escalated-search">
              <IconSearch size={16} aria-hidden />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket ID, customer, subject…"
                aria-label="Search escalated tickets"
              />
            </div>
            <div className="hs-escalated-quick-filters" role="group" aria-label="Quick filters">
              <button type="button" className={`hs-escalated-chip${!assigneeFilter ? " is-active" : ""}`} onClick={() => setAssigneeFilter("")}>
                All
              </button>
              {unassignedCount > 0 ? (
                <button
                  type="button"
                  className={`hs-escalated-chip hs-escalated-chip--warn${assigneeFilter === UNASSIGNED_FILTER ? " is-active" : ""}`}
                  onClick={() => setAssigneeFilter(UNASSIGNED_FILTER)}
                >
                  Unassigned ({unassignedCount})
                </button>
              ) : null}
            </div>
            <label className="hs-escalated-filter">
              <IconFilter size={15} aria-hidden />
              <span>Assignee</span>
              <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} aria-label="Filter by assigned member">
                <option value="">All assignees</option>
                {unassignedCount > 0 ? <option value={UNASSIGNED_FILTER}>Unassigned ({unassignedCount})</option> : null}
                {assigneeOptions.map(({ id, name }) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="hs-ticket-export-btn hs-ticket-export-btn--escalated"
              onClick={() => exportTicketsCsv(filteredTickets)}
              disabled={!filteredTickets.length}
            >
              <IconDownload size={14} />
              Export CSV
            </button>
          </div>

          {loading ? (
            <div className="hs-empty hs-empty--loading hs-escalated-loading">
              <IconLoader size={22} className="animate-spin" />
              Loading escalated tickets…
            </div>
          ) : (
            <EscalatedTicketTable
              tickets={filteredTickets}
              selectedId={selectedTicket ? ticketId(selectedTicket) : null}
              onSelect={openAssign}
              onAssignUnassigned={(t, e) => {
                e.stopPropagation();
                openAssign(t);
              }}
            />
          )}
        </div>
      )}

      {tab === "technical-team" && (
        <div className="hs-panel hs-panel--full hs-escalated-panel hs-escalated-panel--team">
          <div className="hs-escalated-panel__hero hs-escalated-panel__hero--indigo">
            <div className="hs-escalated-panel__hero-main">
              <div className="hs-escalated-panel__hero-icon hs-escalated-panel__hero-icon--indigo" aria-hidden>
                <IconUsers size={22} />
              </div>
              <div>
                <h2>Technical team</h2>
                <p className="hs-panel__head-sub">Specialists who receive escalated tickets via email and SMS</p>
              </div>
            </div>
          </div>
          <TechnicalTeamRoster members={members} loading={membersLoading} />
        </div>
      )}

      {tab === "manage-team" && (
        <div className="hs-panel hs-panel--full hs-escalated-panel hs-escalated-panel--manage">
          <div className="hs-escalated-panel__hero hs-escalated-panel__hero--violet">
            <div className="hs-escalated-panel__hero-main">
              <div className="hs-escalated-panel__hero-icon hs-escalated-panel__hero-icon--violet" aria-hidden>
                <IconSettings size={22} />
              </div>
              <div>
                <h2>Manage team</h2>
                <p className="hs-panel__head-sub">Add specialists who receive email and SMS when tickets are assigned</p>
              </div>
            </div>
          </div>
          <TechnicalTeamManageSection onMembersChanged={handleMembersChanged} />
        </div>
      )}

      <EscalatedAssignDrawer
        open={assignOpen}
        ticket={selectedTicket}
        onClose={() => setAssignOpen(false)}
        onAssigned={handleAssigned}
      />
    </div>
  );
}
