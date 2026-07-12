"use client";

import { useMemo } from "react";
import { channelLabel, statusColor, statusLabel } from "@/lib/ticketConstants";

type TicketRow = {
  status: string;
  channel?: string;
  sourceChannel?: string;
};

type Slice = {
  key: string;
  label: string;
  value: number;
  color: string;
  pct: number;
};

const DONUT_R = 52;
const DONUT_STROKE = 18;
const DONUT_C = 2 * Math.PI * DONUT_R;

function buildStatusSlices(tickets: TicketRow[]): Slice[] {
  const counts = new Map<string, number>();
  for (const t of tickets) {
    const key = t.status || "UNKNOWN";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const total = tickets.length || 1;
  return [...counts.entries()]
    .map(([key, value]) => ({
      key,
      label: statusLabel(key),
      value,
      color: statusColor(key),
      pct: Math.round((value / total) * 100),
    }))
    .sort((a, b) => b.value - a.value);
}

function buildChannelSlices(tickets: TicketRow[]): Slice[] {
  const counts = new Map<string, number>();
  for (const t of tickets) {
    const key = t.sourceChannel || t.channel || "UNKNOWN";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const total = tickets.length || 1;
  const palette = ["#3170a5", "#2c4f72", "#0ea5e9", "#0d9488", "#f59e0b", "#64748b"];
  return [...counts.entries()]
    .map(([key, value], i) => ({
      key,
      label: channelLabel(key),
      value,
      color: palette[i % palette.length],
      pct: Math.round((value / total) * 100),
    }))
    .sort((a, b) => b.value - a.value);
}

function DonutChart({ slices, total }: { slices: Slice[]; total: number }) {
  let offset = 0;

  return (
    <div className="sx-ticket-analytics__donut-wrap">
      <svg viewBox="0 0 140 140" className="sx-ticket-analytics__donut" aria-hidden>
        <circle cx="70" cy="70" r={DONUT_R} fill="none" stroke="#eef2ff" strokeWidth={DONUT_STROKE} />
        {slices.map((slice) => {
          const arc = (slice.value / total) * DONUT_C;
          const dash = `${arc} ${DONUT_C - arc}`;
          const el = (
            <circle
              key={slice.key}
              cx="70"
              cy="70"
              r={DONUT_R}
              fill="none"
              stroke={slice.color}
              strokeWidth={DONUT_STROKE}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              transform="rotate(-90 70 70)"
              strokeLinecap="butt"
            />
          );
          offset += arc;
          return el;
        })}
      </svg>
      <div className="sx-ticket-analytics__donut-center">
        <strong>{total}</strong>
        <span>Total</span>
      </div>
    </div>
  );
}

function StatusLegend({ slices }: { slices: Slice[] }) {
  return (
    <ul className="sx-ticket-analytics__legend">
      {slices.map((slice) => (
        <li key={slice.key}>
          <span className="sx-ticket-analytics__legend-dot" style={{ background: slice.color }} />
          <span className="sx-ticket-analytics__legend-label">{slice.label}</span>
          <span className="sx-ticket-analytics__legend-value">
            {slice.value} <em>({slice.pct}%)</em>
          </span>
        </li>
      ))}
    </ul>
  );
}

function ChannelBars({ slices }: { slices: Slice[] }) {
  const max = Math.max(...slices.map((s) => s.value), 1);
  return (
    <div className="sx-ticket-analytics__bars">
      {slices.map((slice) => (
        <div key={slice.key} className="sx-ticket-analytics__bar-row">
          <div className="sx-ticket-analytics__bar-meta">
            <span>{slice.label}</span>
            <strong>
              {slice.value} ({slice.pct}%)
            </strong>
          </div>
          <div className="sx-ticket-analytics__bar-track">
            <div
              className="sx-ticket-analytics__bar-fill"
              style={{ width: `${(slice.value / max) * 100}%`, background: slice.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

type Props = {
  tickets: TicketRow[];
};

export function TicketAnalyticsCharts({ tickets }: Props) {
  const total = tickets.length;
  const statusSlices = useMemo(() => buildStatusSlices(tickets), [tickets]);
  const channelSlices = useMemo(() => buildChannelSlices(tickets), [tickets]);

  if (total === 0) {
    return (
      <div className="sx-ticket-analytics sx-ticket-analytics--empty">
        <p className="sx-help-tickets-overview__empty">No ticket data yet — charts appear once you have tickets.</p>
      </div>
    );
  }

  return (
    <div className="sx-ticket-analytics">
      <div className="sx-ticket-analytics__grid">
        <div className="sx-help-tickets-overview__chart">
          <p className="sx-ticket-analytics__chart-title">Status breakdown</p>
          <DonutChart slices={statusSlices} total={total} />
          <StatusLegend slices={statusSlices} />
        </div>

        <div className="sx-help-tickets-overview__chart sx-ticket-analytics__channel-chart">
          <p className="sx-ticket-analytics__chart-title">Tickets by channel</p>
          <ChannelBars slices={channelSlices} />
        </div>
      </div>
    </div>
  );
}
