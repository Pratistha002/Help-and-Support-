"use client";

import { useEffect, useState } from "react";
import { supportApi } from "@/lib/supportApi";
import { IconMail, IconPhone, IconUser, IconWrench } from "./AdminIcons";
import { TechnicalTeamManageSection } from "./TechnicalTeamManageSection";
import "./escalated-tickets.css";

type Props = {
  ticket: any;
  onAssigned?: (data: any) => void;
  onCancel?: () => void;
  locked?: boolean;
  lockedReason?: string;
};

export function TechnicalEscalationPanel({ ticket, onAssigned, onCancel, locked, lockedReason }: Props) {
  const [tab, setTab] = useState<"assign" | "manage">("assign");
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedId, setSelectedId] = useState(ticket?.assignedTechnicalMemberId || "");
  const [note, setNote] = useState(ticket?.escalationNote || "");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const loadMembers = () => {
    setLoading(true);
    setError("");
    supportApi
      .adminTechnicalTeam()
      .then((data) => setMembers(Array.isArray(data) ? data : []))
      .catch(() => setError("Could not load technical team"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMembers();
  }, []);

  useEffect(() => {
    setSelectedId(ticket?.assignedTechnicalMemberId || "");
    setNote(ticket?.escalationNote || "");
  }, [ticket?._id, ticket?.assignedTechnicalMemberId, ticket?.escalationNote]);

  const handleSubmit = async () => {
    if (locked) {
      setError(lockedReason || "Accept this ticket before assigning to the technical team.");
      return;
    }
    if (!selectedId) {
      setError("Select a technical team member");
      return;
    }
    setSubmitting(true);
    setError("");
    setStatus("");
    try {
      const data = await supportApi.adminEscalateToTechnical(String(ticket._id || ticket.id), {
        technicalMemberId: selectedId,
        note: note.trim() || undefined,
      });
      const parts = [data?.message || "Ticket assigned to technical team."];
      if (data?.emailSent) parts.push("Email sent.");
      if (data?.smsSent) parts.push("SMS sent.");
      if (data?.emailError) parts.push(`Email: ${data.emailError}`);
      if (data?.smsError) parts.push(`SMS: ${data.smsError}`);
      setStatus(parts.join(" "));
      onAssigned?.(data);
    } catch (err: any) {
      setError(err?.message || "Escalation failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="hs-tech-escalation">
      <div className="hs-tech-tabs">
        <button
          type="button"
          className={`hs-tech-tabs__btn${tab === "assign" ? " is-active" : ""}`}
          onClick={() => setTab("assign")}
        >
          <IconWrench size={14} />
          Assign ticket
        </button>
        <button
          type="button"
          className={`hs-tech-tabs__btn${tab === "manage" ? " is-active" : ""}`}
          onClick={() => setTab("manage")}
        >
          Manage team
        </button>
      </div>

      {tab === "manage" ? (
        <TechnicalTeamManageSection onMembersChanged={loadMembers} />
      ) : (
        <>
          <div className="hs-tech-escalation__head">
            <div>
              <strong>
                <IconWrench size={16} /> Assign to technical team
              </strong>
              <p>
                Select who will resolve this ticket. They receive email and SMS; the customer is also notified when you resolve.
              </p>
            </div>
          </div>

          {loading ? (
            <p className="sx-help-muted">Loading technical team…</p>
          ) : !members.length ? (
            <div className="hs-tech-escalation--empty">
              <p>No technical team members yet.</p>
              <button type="button" className="hs-btn hs-btn--ghost" onClick={() => setTab("manage")}>
                Manage team
              </button>
            </div>
          ) : (
            <>
              <div className="hs-tech-escalation__list" role="listbox" aria-label="Technical team members">
                {members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    role="option"
                    aria-selected={selectedId === m.id}
                    className={`hs-tech-member${selectedId === m.id ? " is-selected" : ""}`}
                    onClick={() => setSelectedId(m.id)}
                    disabled={locked || submitting}
                  >
                    <span className="hs-tech-member__avatar" aria-hidden>
                      <IconUser size={18} />
                    </span>
                    <span className="hs-tech-member__info">
                      <span className="hs-tech-member__name">{m.name}</span>
                      {(m.designation || m.specialty) && (
                        <span className="hs-tech-member__dept">{m.designation || m.specialty}</span>
                      )}
                      <span className="hs-tech-member__contact">
                        {m.email && (
                          <span>
                            <IconMail size={12} /> {m.email}
                          </span>
                        )}
                        {m.phone && (
                          <span>
                            <IconPhone size={12} /> {m.phone}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                ))}
              </div>

              <label className="hs-tech-escalation__note">
                <span>Note for technical team (optional)</span>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Context for the assignee…"
                  disabled={locked || submitting}
                />
              </label>

              {error ? (
                <p className="hs-tech-escalation__error" role="alert">
                  {error}
                </p>
              ) : null}
              {status ? <p className="admin-action-status">{status}</p> : null}

              <div className="hs-tech-escalation__actions">
                {onCancel ? (
                  <button type="button" className="hs-btn hs-btn--ghost" onClick={onCancel} disabled={submitting}>
                    Cancel
                  </button>
                ) : null}
                <button
                  type="button"
                  className="hs-btn hs-btn--primary"
                  disabled={submitting || !selectedId || locked}
                  onClick={() => void handleSubmit()}
                >
                  {ticket?.assignedTechnicalMemberId ? "Reassign & notify" : "Assign & escalate"}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
