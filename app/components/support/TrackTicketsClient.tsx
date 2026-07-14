"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { appPath } from "@/lib/apiBase";
import { resolveSupportAuth } from "@/lib/resolveSupportAuth";
import { syncWorkforceAuthFromPage } from "@/lib/workforceSync";
import { supportApi } from "@/lib/supportApi";
import { channelLabel, statusColor, statusLabel } from "@/lib/ticketConstants";
import { TicketAnalyticsCharts } from "./TicketAnalyticsCharts";
import "./help.css";
import "./track-tickets.css";

type TicketRow = {
  id?: string;
  _id?: string;
  ticketNumber: string;
  subject: string;
  description?: string;
  channel?: string;
  sourceChannel?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

function ticketKey(t: TicketRow) {
  return String(t.id ?? t._id ?? t.ticketNumber);
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function canCloseTicket(status: string) {
  return status !== "CLOSED";
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className="sx-help-status-pill"
      style={{
        background: `${statusColor(status)}18`,
        color: statusColor(status),
        border: `1px solid ${statusColor(status)}40`,
      }}
    >
      {statusLabel(status)}
    </span>
  );
}

export function TrackTicketsClient() {
  const [auth, setAuth] = useState(resolveSupportAuth());
  const [email, setEmail] = useState(auth.user?.email || "");
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [confirmCloseId, setConfirmCloseId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setAuth(resolveSupportAuth());
    sync();
    window.addEventListener("hs-auth-changed", sync);
    window.addEventListener("jbv2-org-auth-changed", sync);
    window.addEventListener("workforce-help-sync-done", sync);
    return () => {
      window.removeEventListener("hs-auth-changed", sync);
      window.removeEventListener("jbv2-org-auth-changed", sync);
      window.removeEventListener("workforce-help-sync-done", sync);
    };
  }, []);

  useEffect(() => {
    void syncWorkforceAuthFromPage();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 4000);
  };

  const loadTickets = useCallback(async (opts?: { guestEmail?: string }) => {
    setLoading(true);
    setError("");
    try {
      const resolved = resolveSupportAuth();
      let rows: TicketRow[] = [];
      if (resolved.token) {
        rows = await supportApi.getTickets();
        setGuestMode(false);
      } else {
        const lookupEmail = (opts?.guestEmail ?? email).trim();
        if (!lookupEmail) {
          setError("Enter your email to view tickets");
          setTickets([]);
          return;
        }
        rows = await supportApi.lookupTickets(lookupEmail);
        setGuestMode(true);
        setEmail(lookupEmail);
      }
      setTickets(Array.isArray(rows) ? rows : []);
    } catch (err: any) {
      setError(err?.message || "Could not load tickets");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    if (auth.token) void loadTickets();
  }, [auth.token, loadTickets]);

  const lookupByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    await loadTickets({ guestEmail: email });
  };

  const handleCloseTicket = async (ticket: TicketRow) => {
    const id = ticketKey(ticket);
    setClosingId(id);
    try {
      const resolved = resolveSupportAuth();
      const res = resolved.token
        ? await supportApi.closeTicket(id)
        : await supportApi.closeGuestTicket(id, { email: email.trim() });
      const updated = res.ticket as TicketRow;
      setTickets((prev) => prev.map((t) => (ticketKey(t) === id ? { ...t, ...updated } : t)));
      setConfirmCloseId(null);
      showToast(res.message || "Ticket closed");
    } catch (err: any) {
      showToast(err?.message || "Could not close ticket");
    } finally {
      setClosingId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter(
      (t) =>
        t.ticketNumber?.toLowerCase().includes(q) ||
        t.subject?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q),
    );
  }, [tickets, search]);

  const stats = useMemo(() => {
    const open = tickets.filter((t) => t.status !== "CLOSED" && t.status !== "RESOLVED").length;
    const done = tickets.filter((t) => t.status === "CLOSED" || t.status === "RESOLVED").length;
    return { total: tickets.length, open, done };
  }, [tickets]);

  const recent = useMemo(
    () =>
      [...tickets]
        .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime())
        .slice(0, 4),
    [tickets],
  );

  const showTable = auth.token || guestMode;

  return (
    <div className="sx-help-page">
      {toast ? <div className="sx-help-toast">{toast}</div> : null}

      <div className="sx-help-layout">
        <Link href={appPath("/help-and-support")} className="sx-form-back">
          ← Help & Support
        </Link>

        <section className="sx-form-hero" style={{ marginTop: 16 }}>
          <h1>Track Ticket</h1>
          <p>
            View your support requests, check status updates, and close tickets when you no longer need help.
            Changes sync to the admin desk immediately.
          </p>
        </section>

        {!auth.token && !guestMode && (
          <div className="sx-ticket-hub__guest">
            <div className="sx-ticket-hub__guest-card">
              <div className="sx-ticket-hub__guest-icon" aria-hidden>
                ✉️
              </div>
              <div className="sx-ticket-hub__guest-copy">
                <h3>View tickets by email</h3>
                <p>Enter the email you used when submitting support requests.</p>
              </div>
              <form className="sx-ticket-hub__guest-form" onSubmit={lookupByEmail}>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button type="submit" disabled={loading}>
                  {loading ? "Searching…" : "View my tickets"}
                </button>
              </form>
            </div>
          </div>
        )}

        {auth.token && (
          <div className="sx-help-subpage__notice" style={{ marginBottom: 16 }}>
            Signed in as <strong>{auth.user?.email}</strong>. You can close any open ticket — our support team will see it as closed.
          </div>
        )}

        {guestMode && !auth.token && tickets.length > 0 && (
          <div className="sx-help-subpage__notice" style={{ marginBottom: 16 }}>
            Showing tickets for <strong>{email.trim()}</strong>.
          </div>
        )}

        {showTable && (
          <>
            <div className="sx-ticket-hub__stats">
              <div className="sx-ticket-hub__stat sx-ticket-hub__stat--total">
                <div className="sx-ticket-hub__stat-icon" aria-hidden>
                  🎫
                </div>
                <div>
                  <span>Total tickets</span>
                  <strong>{stats.total}</strong>
                </div>
              </div>
              <div className="sx-ticket-hub__stat sx-ticket-hub__stat--open">
                <div className="sx-ticket-hub__stat-icon" aria-hidden>
                  ⏳
                </div>
                <div>
                  <span>Open / active</span>
                  <strong>{stats.open}</strong>
                </div>
              </div>
              <div className="sx-ticket-hub__stat sx-ticket-hub__stat--done">
                <div className="sx-ticket-hub__stat-icon" aria-hidden>
                  ✓
                </div>
                <div>
                  <span>Resolved / closed</span>
                  <strong>{stats.done}</strong>
                </div>
              </div>
            </div>

            {tickets.length > 0 && (
              <div className="sx-ticket-hub__overview-row">
                <div className="sx-help-card sx-help-tickets-overview-card">
                  <div className="sx-help-card__head">
                    <h3>Ticket analytics</h3>
                  </div>
                  <div className="sx-help-tickets-overview">
                    <TicketAnalyticsCharts tickets={tickets} />
                    {recent.length > 0 ? (
                      <div className="sx-help-tickets-overview__recent">
                        <p className="sx-help-tickets-overview__recent-title">Latest updates</p>
                        <div style={{ display: "grid", gap: 8 }}>
                          {recent.map((t) => (
                            <div
                              key={ticketKey(t)}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 12,
                                padding: "10px 12px",
                                borderRadius: 12,
                                background: "#f8fafc",
                                border: "1px solid #e8ecf2",
                                fontSize: 13,
                              }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <strong style={{ color: "#3170a5" }}>{t.ticketNumber}</strong>
                                <div style={{ color: "#475569", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {t.subject || "Support request"}
                                </div>
                              </div>
                              <StatusBadge status={t.status} />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            <div className="sx-ticket-hub__section-head">
              <span aria-hidden>🎫</span>
              <h2>Your tickets</h2>
            </div>

            <div className="sx-ticket-hub__list-card">
              <div className="sx-ticket-hub__toolbar">
                <div className="sx-ticket-hub__search">
                  <span aria-hidden>🔍</span>
                  <input
                    type="search"
                    placeholder="Search by ticket ID, subject, or message…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                {auth.token ? (
                  <button
                    type="button"
                    onClick={() => void loadTickets()}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      background: "#fff",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Refresh
                  </button>
                ) : null}
              </div>

              {loading ? (
                <p className="sx-ticket-hub__empty">Loading your tickets…</p>
              ) : error ? (
                <p className="sx-ticket-hub__empty" style={{ color: "#b91c1c" }}>
                  {error}
                </p>
              ) : filtered.length === 0 ? (
                <p className="sx-ticket-hub__empty">
                  {tickets.length === 0
                    ? "No tickets yet. Submit a query from Help & Support to get started."
                    : "No tickets match your search."}
                </p>
              ) : (
                <div className="sx-ticket-hub__table-wrap">
                  <table className="sx-ticket-hub__table">
                    <thead>
                      <tr>
                        <th>Ticket ID</th>
                        <th>Issue description</th>
                        <th>Channel</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Last update</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((t) => {
                        const id = ticketKey(t);
                        const channel = t.sourceChannel || t.channel || "—";
                        return (
                          <tr key={id}>
                            <td className="sx-ticket-hub__id">{t.ticketNumber}</td>
                            <td>
                              <div className="sx-ticket-hub__subject">{t.subject || "Support request"}</div>
                              {t.description ? <div className="sx-ticket-hub__preview">{t.description}</div> : null}
                            </td>
                            <td>{channelLabel(channel)}</td>
                            <td>
                              <StatusBadge status={t.status} />
                            </td>
                            <td>{formatDate(t.createdAt)}</td>
                            <td>{formatDate(t.updatedAt || t.createdAt)}</td>
                            <td className="sx-ticket-hub__actions-cell">
                              {canCloseTicket(t.status) ? (
                                confirmCloseId === id ? (
                                  <div className="sx-ticket-hub__close-confirm">
                                    <span>Close this ticket?</span>
                                    <div className="sx-ticket-hub__close-confirm-actions">
                                      <button
                                        type="button"
                                        className="sx-ticket-hub__close-confirm-yes"
                                        disabled={closingId === id}
                                        onClick={() => void handleCloseTicket(t)}
                                      >
                                        {closingId === id ? "Closing…" : "Yes, close"}
                                      </button>
                                      <button
                                        type="button"
                                        className="sx-ticket-hub__close-confirm-no"
                                        disabled={closingId === id}
                                        onClick={() => setConfirmCloseId(null)}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    className="sx-ticket-hub__close-btn"
                                    onClick={() => setConfirmCloseId(id)}
                                  >
                                    Close ticket
                                  </button>
                                )
                              ) : (
                                <span className="sx-ticket-hub__actions-muted">Closed</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {!auth.token && !guestMode && (
          <div className="sx-ticket-hub__cta">
            <p>New here?</p>
            <Link href={appPath("/help-and-support/support-form")} className="sx-ticket-hub__cta-btn">
              Create a support ticket
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
