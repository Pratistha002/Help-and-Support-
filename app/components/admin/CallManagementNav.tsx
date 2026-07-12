"use client";

import {
  IconChart,
  IconHeadphones,
  IconListOrdered,
  IconPhone,
  IconPhoneOutgoing,
  IconRefresh,
  IconTicket,
} from "./AdminIcons";

const NAV_ITEMS = [
  { id: "hs-call-softphone", label: "Softphone", tone: "blue", icon: "headphones" as const },
  { id: "hs-call-metrics", label: "Metrics", tone: "violet", icon: "chart" as const },
  { id: "hs-call-queue", label: "Call queue", tone: "amber", icon: "list", badgeKey: "queue" as const },
  { id: "hs-call-callback", label: "Call back", tone: "emerald", icon: "phone" as const },
  { id: "hs-call-tickets", label: "Tickets", tone: "indigo", icon: "ticket", badgeKey: "tickets" as const },
];

function NavIcon({ type }: { type: string }) {
  if (type === "chart") return <IconChart size={14} />;
  if (type === "phone") return <IconPhoneOutgoing size={14} />;
  if (type === "headphones") return <IconHeadphones size={14} />;
  if (type === "ticket") return <IconTicket size={14} />;
  return <IconListOrdered size={14} />;
}

export function CallManagementNav({
  agentOnline = false,
  queuedCount = 0,
  callTicketsOpen = 0,
  onRefresh,
  onViewTickets,
  onRaiseTicket,
  raiseTicketOpen = false,
  refreshing = false,
}: {
  agentOnline?: boolean;
  queuedCount?: number;
  callTicketsOpen?: number;
  onRefresh?: () => void;
  onViewTickets?: () => void;
  onRaiseTicket?: () => void;
  raiseTicketOpen?: boolean;
  refreshing?: boolean;
}) {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const badges: Record<string, number | null> = {
    queue: queuedCount > 0 ? queuedCount : null,
    tickets: callTicketsOpen > 0 ? callTicketsOpen : null,
  };

  return (
    <nav className="hs-call-mgmt-nav" aria-label="Call management sections">
      <div className="hs-call-mgmt-nav__inner">
        <div className="hs-call-mgmt-nav__links">
          {NAV_ITEMS.map(({ id, label, tone, icon, badgeKey }) => {
            const badge = badgeKey ? badges[badgeKey] : null;
            return (
              <button
                key={id}
                type="button"
                className={`hs-call-mgmt-nav__link hs-call-mgmt-nav__link--${tone}`}
                onClick={() => scrollTo(id)}
              >
                <span className="hs-call-mgmt-nav__link-icon" aria-hidden>
                  <NavIcon type={icon} />
                </span>
                <span className="hs-call-mgmt-nav__link-label">{label}</span>
                {badge != null && <span className="hs-call-mgmt-nav__badge">{badge}</span>}
              </button>
            );
          })}
        </div>

        <div className="hs-call-mgmt-nav__actions">
          {onRaiseTicket && (
            <button
              type="button"
              className={`hs-call-mgmt-nav__action hs-call-mgmt-nav__action--raise${raiseTicketOpen ? " is-open" : ""}`}
              onClick={onRaiseTicket}
              aria-expanded={raiseTicketOpen}
            >
              <IconPhone size={15} aria-hidden />
              Raise ticket
            </button>
          )}
          <span
            className={`hs-call-mgmt-nav__status${agentOnline ? " is-online" : " is-offline"}`}
            title={agentOnline ? "Agent is online for callbacks" : "Go online to place callback calls"}
          >
            <span className="hs-call-mgmt-nav__status-dot" aria-hidden />
            {agentOnline ? "Online" : "Offline"}
          </span>
          {onViewTickets && (
            <button type="button" className="hs-call-mgmt-nav__action hs-call-mgmt-nav__action--tickets" onClick={onViewTickets}>
              <IconTicket size={15} aria-hidden />
              All tickets
            </button>
          )}
          {onRefresh && (
            <button
              type="button"
              className="hs-call-mgmt-nav__action hs-call-mgmt-nav__action--refresh"
              onClick={() => onRefresh()}
              disabled={refreshing}
              title="Refresh dashboard"
            >
              <IconRefresh size={15} className={refreshing ? "hs-spin" : ""} aria-hidden />
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
