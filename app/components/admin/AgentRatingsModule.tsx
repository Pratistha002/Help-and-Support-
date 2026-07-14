"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { supportApi } from "@/lib/supportApi";
import { AGENT_RATING_LABELS } from "@/lib/supportConstants";
import { IconCheckCircle, IconRefresh, IconStar, IconTicket, IconUser } from "./AdminIcons";

type AgentRow = {
  id: string;
  email: string;
  name: string;
  lastLoginAt?: string;
  avgRating: number;
  ratingCount: number;
  ticketsSolved: number;
  ticketsAssigned: number;
  liveChatsHandled: number;
  recentRatings: Array<{
    id: string;
    rating: number;
    comment?: string;
    tags?: string[];
    userName?: string;
    userEmail?: string;
    createdAt?: string;
  }>;
};

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const full = Math.round(value);
  return (
    <span className="hs-agent-ratings__stars" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= full ? "is-on" : ""} style={{ fontSize: size }}>
          ★
        </span>
      ))}
    </span>
  );
}

function formatDate(value?: string) {
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

export function AgentRatingsModule() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [overall, setOverall] = useState({ avgRating: 0, ratingCount: 0, ticketsSolved: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await supportApi.adminAgentsWithRatings();
      setAgents(data.agents || []);
      setOverall({
        avgRating: data.overall?.avgRating || 0,
        ratingCount: data.overall?.ratingCount || 0,
        ticketsSolved: data.overall?.ticketsSolved || 0,
      });
    } catch (e: any) {
      setError(e?.message || "Could not load agents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter(
      (a) => a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q),
    );
  }, [agents, query]);

  const totalSolved = useMemo(
    () => agents.reduce((sum, a) => sum + (a.ticketsSolved || 0), 0),
    [agents],
  );

  return (
    <section className="hs-agent-ratings" aria-label="Help desk agents">
      <header className="hs-agent-ratings__header">
        <div>
          <p className="admin-page__eyebrow">Help desk login registry</p>
          <h2 className="hs-agent-ratings__title">Help Desk Agents</h2>
          <p className="hs-agent-ratings__subtitle">
            Every agent who signs in with Help Admin login (name + email) is saved here. View their
            average rating and how many tickets they have solved.
          </p>
        </div>
        <button type="button" className="hs-agent-ratings__refresh" onClick={() => void load()} disabled={loading}>
          <IconRefresh size={14} />
          Refresh
        </button>
      </header>

      <div className="hs-agent-ratings__kpis">
        <div className="hs-agent-ratings__kpi">
          <IconUser size={16} />
          <strong>{agents.length}</strong>
          <span>Registered agents</span>
        </div>
        <div className="hs-agent-ratings__kpi hs-agent-ratings__kpi--accent">
          <IconStar size={16} />
          <strong>{overall.avgRating ? overall.avgRating.toFixed(1) : "—"}</strong>
          <span>Overall avg rating</span>
        </div>
        <div className="hs-agent-ratings__kpi">
          <IconCheckCircle size={16} />
          <strong>{totalSolved || overall.ticketsSolved || 0}</strong>
          <span>Tickets solved</span>
        </div>
        <div className="hs-agent-ratings__kpi">
          <IconTicket size={16} />
          <strong>{overall.ratingCount}</strong>
          <span>Customer ratings</span>
        </div>
      </div>

      <div className="hs-agent-ratings__toolbar">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by agent name or email…"
          aria-label="Search agents"
        />
      </div>

      {error ? <p className="hs-agent-ratings__error">{error}</p> : null}
      {loading ? <p className="hs-agent-ratings__loading">Loading agents…</p> : null}

      {!loading && agents.length === 0 ? (
        <div className="hs-agent-ratings__empty">
          <p>No help desk agents yet.</p>
          <p>When an agent logs in via Help Desk Admin with name and email, they appear here automatically.</p>
        </div>
      ) : null}

      {!loading && agents.length > 0 && filtered.length === 0 ? (
        <p className="hs-agent-ratings__muted">No agents match “{query}”.</p>
      ) : null}

      <div className="hs-agent-ratings__table-wrap" role="region" aria-label="Agent performance table">
        <table className="hs-agent-ratings__table">
          <thead>
            <tr>
              <th>Agent name</th>
              <th>Email</th>
              <th>Avg rating</th>
              <th>Ratings</th>
              <th>Tickets solved</th>
              <th>Live chats</th>
              <th>Last login</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((agent) => {
              const open = expanded === agent.id;
              return (
                <Fragment key={agent.id}>
                  <tr
                    className={open ? "is-open" : undefined}
                    onClick={() => setExpanded(open ? null : agent.id)}
                  >
                    <td>
                      <span className="hs-agent-ratings__name-cell">
                        <span className="hs-agent-ratings__avatar" aria-hidden>
                          {(agent.name || agent.email).slice(0, 1).toUpperCase()}
                        </span>
                        <strong>{agent.name}</strong>
                      </span>
                    </td>
                    <td>{agent.email}</td>
                    <td>
                      <span className="hs-agent-ratings__rating-cell">
                        <Stars value={agent.avgRating} />
                        <strong>{agent.ratingCount ? agent.avgRating.toFixed(1) : "—"}</strong>
                      </span>
                    </td>
                    <td>{agent.ratingCount}</td>
                    <td>
                      <strong className="hs-agent-ratings__solved">{agent.ticketsSolved}</strong>
                      {agent.ticketsAssigned > 0 ? (
                        <span className="hs-agent-ratings__muted-inline"> / {agent.ticketsAssigned} assigned</span>
                      ) : null}
                    </td>
                    <td>{agent.liveChatsHandled}</td>
                    <td>{formatDate(agent.lastLoginAt)}</td>
                  </tr>
                  {open ? (
                    <tr className="hs-agent-ratings__detail-row">
                      <td colSpan={7}>
                        <div className="hs-agent-ratings__detail">
                          {agent.recentRatings.length === 0 ? (
                            <p className="hs-agent-ratings__muted">No customer ratings yet for this agent.</p>
                          ) : (
                            <ul className="hs-agent-ratings__reviews">
                              {agent.recentRatings.map((r) => (
                                <li key={r.id}>
                                  <div className="hs-agent-ratings__review-head">
                                    <Stars value={r.rating} size={12} />
                                    <strong>
                                      {r.rating}/5 · {AGENT_RATING_LABELS[r.rating] || ""}
                                    </strong>
                                    <time>{formatDate(r.createdAt)}</time>
                                  </div>
                                  <p className="hs-agent-ratings__reviewer">
                                    {r.userName || r.userEmail || "Customer"}
                                  </p>
                                  {r.tags && r.tags.length > 0 ? (
                                    <div className="hs-agent-ratings__review-tags">
                                      {r.tags.map((t) => (
                                        <span key={t}>{t}</span>
                                      ))}
                                    </div>
                                  ) : null}
                                  {r.comment ? (
                                    <p className="hs-agent-ratings__review-comment">{r.comment}</p>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
