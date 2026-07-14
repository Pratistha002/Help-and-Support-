export type TicketDashboardStats = {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  pendingTickets: number;
  pendingWithUserTickets: number;
  escalatedTickets: number;
  resolvedTickets: number;
  ticketsByStatus: Record<string, number>;
  ticketsByChannel: Record<string, number>;
  ticketsByConsumerType: Record<string, number>;
  ticketsByPriority: Record<string, number>;
  resolutionRatePercent: number;
  averageResponseTimeHours: number | null;
  customerSatisfactionScore: number;
};

export function buildTicketDashboardStats(
  tickets: any[],
  statusCounts: Record<string, number> = {},
  csatScore?: number | null,
): TicketDashboardStats {
  const byStatus: Record<string, number> = {};
  const byConsumer: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  const byChannel: Record<string, number> = {};

  for (const t of tickets) {
    const status = String(t.status || "OPEN");
    byStatus[status] = (byStatus[status] || 0) + 1;
    const consumer = String(t.consumerType || "UNKNOWN");
    byConsumer[consumer] = (byConsumer[consumer] || 0) + 1;
    const priority = String(t.priority || "MEDIUM");
    byPriority[priority] = (byPriority[priority] || 0) + 1;
    const channel = String(t.sourceChannel || t.channel || "UNKNOWN");
    byChannel[channel] = (byChannel[channel] || 0) + 1;
  }

  const pick = (key: string, fallback = 0) =>
    statusCounts[key] ?? byStatus[key] ?? fallback;

  const total = statusCounts.TOTAL ?? tickets.length;
  const closed = pick("CLOSED");
  const resolved = pick("RESOLVED");
  const resolvedTotal = resolved + closed;
  const resolutionRate = total > 0 ? Math.round((resolvedTotal / total) * 1000) / 10 : 0;

  const closedTickets = tickets.filter(
    (t) => ["RESOLVED", "CLOSED"].includes(t.status) && t.createdAt && (t.updatedAt || t.resolvedAt),
  );
  let averageResponseTimeHours: number | null = null;
  if (closedTickets.length > 0) {
    const totalMs = closedTickets.reduce((sum, t) => {
      const end = new Date(t.updatedAt || t.resolvedAt).getTime();
      const start = new Date(t.createdAt).getTime();
      return sum + Math.max(0, end - start);
    }, 0);
    averageResponseTimeHours = Math.round((totalMs / closedTickets.length / 3600000) * 10) / 10;
  }

  return {
    totalTickets: total,
    openTickets: pick("OPEN"),
    inProgressTickets: pick("IN_PROGRESS"),
    pendingTickets: pick("PENDING"),
    pendingWithUserTickets: pick("PENDING_WITH_USER"),
    escalatedTickets: pick("ESCALATED"),
    resolvedTickets: resolved,
    ticketsByStatus: { ...byStatus, ...Object.fromEntries(
      Object.entries(statusCounts).filter(([k]) => k !== "TOTAL"),
    ) },
    ticketsByChannel: byChannel,
    ticketsByConsumerType: byConsumer,
    ticketsByPriority: byPriority,
    resolutionRatePercent: resolutionRate,
    averageResponseTimeHours,
    customerSatisfactionScore:
      typeof csatScore === "number" && Number.isFinite(csatScore) && csatScore > 0
        ? Math.round(csatScore * 10) / 10
        : 0,
  };
}
