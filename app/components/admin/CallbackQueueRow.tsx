"use client";

import { useState } from "react";
import {
  IconCheckCircle,
  IconClock,
  IconLoader,
  IconPhoneOutgoing,
  IconXCircle,
} from "./AdminIcons";

function normalizeStatus(status?: string) {
  const s = (status || "PENDING").toUpperCase();
  if (s === "QUEUED" || s === "ASSIGNED") return "PENDING";
  if (s === "DIALING" || s === "CALLING") return "CALLING";
  if (s === "COMPLETED" || s === "RESOLVED_OTHER") return "RESOLVED";
  if (s === "NO_ANSWER" || s === "FAILED" || s === "CANCELED") return "NOT_CONNECTED";
  return s;
}

function queueStatusClass(status?: string) {
  const s = normalizeStatus(status);
  if (s === "PENDING") return "hs-callback-queue__status hs-callback-queue__status--queued";
  if (s === "CALLING") return "hs-callback-queue__status hs-callback-queue__status--dialing";
  if (s === "CONNECTED") return "hs-callback-queue__status hs-callback-queue__status--connected";
  if (s === "RESOLVED") return "hs-callback-queue__status hs-callback-queue__status--done";
  if (s === "NOT_CONNECTED") return "hs-callback-queue__status hs-callback-queue__status--missed";
  return "hs-callback-queue__status";
}

function queueStatusLabel(status?: string) {
  const map: Record<string, string> = {
    PENDING: "Pending",
    CALLING: "Calling",
    CONNECTED: "Connected",
    RESOLVED: "Resolved",
    NOT_CONNECTED: "Not connected",
  };
  return map[normalizeStatus(status)] || normalizeStatus(status);
}

export type CallbackQueueItem = {
  id: string;
  requestedAt?: string;
  callerName?: string;
  callerEmail?: string;
  phone?: string;
  status?: string;
};

type UpdatePayload = {
  status?: string;
  markResolved?: boolean;
  markNotConnected?: boolean;
  markPending?: boolean;
  markConnected?: boolean;
};

type Props = {
  item: CallbackQueueItem;
  selected?: boolean;
  agentOnline: boolean;
  callBackLoadingId?: string | null;
  onSelect?: (id: string) => void;
  onQueueDial?: (id: string) => void;
  onRaiseTicket?: (id: string) => void;
  onUpdate?: (id: string, payload: UpdatePayload) => Promise<{ item?: CallbackQueueItem } | null>;
};

export function CallbackQueueRow({
  item,
  selected = false,
  agentOnline,
  callBackLoadingId,
  onSelect,
  onQueueDial,
  onRaiseTicket,
  onUpdate,
}: Props) {
  const [saving, setSaving] = useState(false);

  const status = normalizeStatus(item.status);
  const loadingKey = `queue-${item.id}`;
  const isDialing = callBackLoadingId === loadingKey;
  const canDial = ["PENDING", "NOT_CONNECTED", "CONNECTED"].includes(status) && agentOnline && Boolean(onQueueDial);
  const displayStatus = isDialing ? "CALLING" : status;

  const patch = async (payload: UpdatePayload) => {
    if (!onUpdate) return null;
    setSaving(true);
    try {
      return await onUpdate(item.id, payload);
    } finally {
      setSaving(false);
    }
  };

  const setStatus = (next: string) => {
    if (next === status || saving) return;
    void patch({ status: next });
  };

  return (
    <tr
      id={item.id ? `hs-callback-row-${item.id}` : undefined}
      className={`hs-callback-queue__row${selected ? " is-selected" : ""}${status === "RESOLVED" ? " hs-callback-queue__row--done" : ""}`}
      onClick={() => onSelect?.(item.id)}
      style={{ cursor: onSelect ? "pointer" : undefined }}
    >
      <td className="hs-call-table__when">
        {item.requestedAt ? new Date(item.requestedAt).toLocaleString() : "—"}
      </td>
      <td>
        <div className="hs-call-table__caller">{item.callerName || "—"}</div>
        {item.callerEmail && <div className="hs-call-table__caller-name">{item.callerEmail}</div>}
      </td>
      <td className="hs-call-table__caller">{item.phone || "—"}</td>
      <td>
        <div className="hs-callback-queue__status-cell">
          <span className={queueStatusClass(displayStatus)}>
            {status === "RESOLVED" ? <IconCheckCircle size={14} /> : null}
            {isDialing ? "Calling" : queueStatusLabel(displayStatus)}
          </span>
        </div>
      </td>
      <td className="hs-callback-queue__actions" onClick={(e) => e.stopPropagation()}>
        {status !== "RESOLVED" && (
          <>
            {["PENDING", "NOT_CONNECTED"].includes(status) && (
              <button
                type="button"
                className="hs-call-dashboard__callback-btn"
                title={agentOnline ? "Call this number" : "Go online on softphone first"}
                onClick={() => onQueueDial?.(item.id)}
                disabled={!canDial || isDialing || saving}
              >
                {isDialing ? <IconLoader size={16} /> : <IconPhoneOutgoing size={16} />}
                Call back
              </button>
            )}

            <div className="hs-callback-queue__outcome" role="group" aria-label="Update call status">
              <button
                type="button"
                className={`hs-callback-queue__outcome-btn hs-callback-queue__outcome-btn--connected${status === "CONNECTED" ? " is-active" : ""}`}
                onClick={() => setStatus("CONNECTED")}
                disabled={saving || status === "CONNECTED"}
                title="Mark as connected"
              >
                <IconPhoneOutgoing size={14} />
                Connected
              </button>
              <button
                type="button"
                className={`hs-callback-queue__outcome-btn hs-callback-queue__outcome-btn--ok${status === "RESOLVED" ? " is-active" : ""}`}
                onClick={() => void patch({ markResolved: true })}
                disabled={saving}
                title="Mark as resolved"
              >
                <IconCheckCircle size={14} />
                Resolved
              </button>
              <button
                type="button"
                className={`hs-callback-queue__outcome-btn hs-callback-queue__outcome-btn--miss${status === "NOT_CONNECTED" ? " is-active" : ""}`}
                onClick={() => void patch({ markNotConnected: true })}
                disabled={saving || status === "NOT_CONNECTED"}
                title="Mark as not connected"
              >
                <IconXCircle size={14} />
                Not connected
              </button>
              <button
                type="button"
                className={`hs-callback-queue__outcome-btn hs-callback-queue__outcome-btn--pending${status === "PENDING" ? " is-active" : ""}`}
                onClick={() => void patch({ markPending: true })}
                disabled={saving || status === "PENDING"}
                title="Mark as pending"
              >
                <IconClock size={14} />
                Pending
              </button>
            </div>

            {onRaiseTicket ? (
              <button
                type="button"
                className="hs-callback-queue__raise-btn"
                onClick={() => onRaiseTicket(item.id)}
                disabled={saving}
                title="Raise support ticket for this call"
              >
                Raise ticket
              </button>
            ) : null}
          </>
        )}
        {status === "RESOLVED" ? <span className="hs-callback-queue__actions--muted">—</span> : null}
      </td>
    </tr>
  );
}
