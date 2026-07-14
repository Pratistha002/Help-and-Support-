"use client";

import { useState } from "react";
import {
  IconCheckCircle,
  IconLoader,
  IconPhoneOutgoing,
  IconTicket,
} from "./AdminIcons";

const STATUS_OPTIONS = [
  { id: "PENDING", label: "Pending" },
  { id: "CONNECTED", label: "Connected" },
  { id: "NOT_CONNECTED", label: "Not connected" },
  { id: "RESOLVED", label: "Resolved" },
] as const;

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
  const selectValue = STATUS_OPTIONS.some((o) => o.id === status) ? status : "PENDING";

  const patch = async (payload: UpdatePayload) => {
    if (!onUpdate) return null;
    setSaving(true);
    try {
      return await onUpdate(item.id, payload);
    } finally {
      setSaving(false);
    }
  };

  const onStatusChange = (next: string) => {
    if (!next || next === status || saving) return;
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
        {item.requestedAt
          ? new Date(item.requestedAt).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })
          : "—"}
      </td>
      <td className="hs-call-table__name-cell">
        <div className="hs-call-table__caller" title={item.callerName || undefined}>
          {item.callerName || "—"}
        </div>
        {item.callerEmail ? (
          <div className="hs-call-table__caller-email" title={item.callerEmail}>
            {item.callerEmail}
          </div>
        ) : null}
      </td>
      <td className="hs-call-table__phone">{item.phone || "—"}</td>
      <td>
        <div className="hs-callback-queue__status-cell">
          <span className={queueStatusClass(displayStatus)}>
            {status === "RESOLVED" ? <IconCheckCircle size={14} /> : null}
            {isDialing ? "Calling" : queueStatusLabel(displayStatus)}
          </span>
        </div>
      </td>
      <td className="hs-callback-queue__actions" onClick={(e) => e.stopPropagation()}>
        {status === "RESOLVED" ? (
          <span className="hs-callback-queue__actions--muted">Completed</span>
        ) : (
          <div className="hs-callback-queue__actions-row">
            {["PENDING", "NOT_CONNECTED", "CONNECTED"].includes(status) ? (
              <button
                type="button"
                className="hs-call-dashboard__callback-btn hs-call-dashboard__callback-btn--sm"
                title={agentOnline ? "Call this number" : "Go online on softphone first"}
                onClick={() => onQueueDial?.(item.id)}
                disabled={!canDial || isDialing || saving}
              >
                {isDialing ? <IconLoader size={14} /> : <IconPhoneOutgoing size={14} />}
                Call back
              </button>
            ) : null}

            <label className="hs-callback-queue__status-select-wrap">
              <span className="visually-hidden">Update status</span>
              <select
                className="hs-callback-queue__status-select"
                value={selectValue}
                disabled={saving || isDialing}
                aria-label="Update call status"
                onChange={(e) => onStatusChange(e.target.value)}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            {onRaiseTicket ? (
              <button
                type="button"
                className="hs-callback-queue__raise-btn"
                onClick={() => onRaiseTicket(item.id)}
                disabled={saving}
                title="Raise support ticket for this call"
              >
                <IconTicket size={14} />
                Ticket
              </button>
            ) : null}
          </div>
        )}
      </td>
    </tr>
  );
}
