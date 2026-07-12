"use client";

import { useEffect, useState } from "react";
import { supportApi } from "@/lib/supportApi";
import { IconMail, IconPhone, IconUser } from "./AdminIcons";
import { TechnicalTeamManageSection } from "./TechnicalTeamManageSection";

type Props = {
  ticket: any;
  onAssigned?: (data: any) => void;
  onCancel?: () => void;
};

export function TechnicalEscalationPanel({ ticket, onAssigned, onCancel }: Props) {
  const [tab, setTab] = useState<"assign" | "manage">("assign");
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedId, setSelectedId] = useState(ticket?.assignedTechnicalMemberId || "");
  const [note, setNote] = useState(ticket?.escalationNote || "");
  const [error, setError] = useState("");

  const loadMembers = () => {
    setLoading(true);
    setError("");
    supportApi.adminTechnicalTeam()
      .then((data) => setMembers(Array.isArray(data) ? data : []))
      .catch(() => setError("Could not load technical team"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadMembers(); }, []);
  useEffect(() => {
    setSelectedId(ticket?.assignedTechnicalMemberId || "");
    setNote(ticket?.escalationNote || "");
  }, [ticket?._id, ticket?.assignedTechnicalMemberId, ticket?.escalationNote]);

  const handleSubmit = async () => {
    if (!selectedId) {
      setError("Select a technical team member");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const data = await supportApi.adminEscalateToTechnical(String(ticket._id || ticket.id), {
        technicalMemberId: selectedId,
        note: note.trim() || undefined,
      });
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
        <button type="button" className={`hs-tech-tabs__btn${tab === "assign" ? " is-active" : ""}`} onClick={() => setTab("assign")}>
          Assign ticket
        </button>
        <button type="button" className={`hs-tech-tabs__btn${tab === "manage" ? " is-active" : ""}`} onClick={() => setTab("manage")}>
          Manage team
        </button>
      </div>

      {tab === "manage" ? (
        <TechnicalTeamManageSection onMembersChanged={loadMembers} />
      ) : (
        <>
          <div className="hs-tech-escalation__head">
            <div>
              <strong>Assign to technical team</strong>
              <p>Select who will resolve this ticket. They receive email and SMS with customer and ticket details.</p>
            </div>
          </div>

          {loading ? (
            <p className="sx-help-muted">Loading technical team…</p>
          ) : !members.length ? (
            <div className="hs-tech-escalation--empty">
              <p>No technical team members yet.</p>
              <button type="button" className="hs-btn hs-btn--ghost" onClick={() => setTab("manage")}>Manage team</button>
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
                  >
                    <span className="hs-tech-member__avatar" aria-hidden><IconUser size={18} /></span>
                    <span className="hs-tech-member__info">
                      <span className="hs-tech-member__name">{m.name}</span>
                      {(m.designation || m.specialty) && <span className="hs-tech-member__dept">{m.designation || m.specialty}</span>}
                      <span className="hs-tech-member__contact">
                        {m.email && <span><IconMail size={12} /> {m.email}</span>}
                        {m.phone && <span><IconPhone size={12} /> {m.phone}</span>}
                      </span>
                    </span>
                  </button>
                ))}
              </div>

              <label className="hs-tech-escalation__note">
                <span>Note for technical team (optional)</span>
                <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Context for the assignee…" />
              </label>

              {error ? <p className="hs-tech-escalation__error" role="alert">{error}</p> : null}

              <div className="hs-tech-escalation__actions">
                {onCancel ? <button type="button" className="hs-btn hs-btn--ghost" onClick={onCancel} disabled={submitting}>Cancel</button> : null}
                <button type="button" className="hs-btn hs-btn--primary" disabled={submitting || !selectedId} onClick={() => void handleSubmit()}>
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
