"use client";

import { useState } from "react";
import {
  IconCheckCircle,
  IconClock,
  IconLoader,
  IconPhoneOutgoing,
  IconXCircle,
} from "./AdminIcons";

const MANUAL_STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "NOT_CONNECTED", label: "Not connected" },
  { value: "RESOLVED", label: "Resolved" },
];

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
};

type Props = {
  item: CallbackQueueItem;
  agentOnline: boolean;
  callBackLoadingId?: string | null;
  onQueueDial?: (id: string) => void;
  onUpdate?: (id: string, payload: UpdatePayload) => Promise<{ item?: CallbackQueueItem } | null>;
};

export function CallbackQueueRow({
  item,
  agentOnline,
  callBackLoadingId,
  onQueueDial,
  onUpdate,
}: Props) {
  const [saving, setSaving] = useState(false);

  const status = normalizeStatus(item.status);
  const rawStatus = (item.status || "PENDING").toUpperCase();
  const loadingKey = `queue-${item.id}`;
  const isDialing = callBackLoadingId === loadingKey;
  const canDial = ["PENDING", "NOT_CONNECTED"].includes(status) && agentOnline && Boolean(onQueueDial);
  const showOutcome = ["CALLING", "CONNECTED"].includes(status) || isDialing;
  const showManualStatusSelect = !showOutcome && status !== "RESOLVED";

  const patch = async (payload: UpdatePayload) => {
    if (!onUpdate) return null;
    setSaving(true);
    try {
      return await onUpdate(item.id, payload);
    } finally {
      setSaving(false);
    }
  };

  const handleManualStatus = async (nextStatus: string) => {
    if (!nextStatus || nextStatus === rawStatus) return;
    await patch({ status: nextStatus });
  };

  if (status === "RESOLVED") {
    return (
      <tr className="hs-callback-queue__row--done">
        <td className="hs-call-table__when">
          {item.requestedAt ? new Date(item.requestedAt).toLocaleString() : "—"}
        </td>
        <td>
          <div className="hs-call-table__caller">{item.callerName || "—"}</div>
          {item.callerEmail && <div className="hs-call-table__caller-name">{item.callerEmail}</div>}
        </td>
        <td className="hs-call-table__caller">{item.phone || "—"}</td>
        <td>
          <span className={queueStatusClass("RESOLVED")}>
            <IconCheckCircle size={14} />
            Resolved
          </span>
        </td>
        <td className="hs-callback-queue__actions hs-callback-queue__actions--muted">—</td>
      </tr>
    );
  }

  return (
    <tr id={item.id ? `hs-callback-row-${item.id}` : undefined}>
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
          {showManualStatusSelect ? (
            <select
              className="hs-callback-queue__select"
              value={rawStatus === "QUEUED" || rawStatus === "ASSIGNED" ? "PENDING" : rawStatus}
              disabled={saving}
              onChange={(e) => void handleManualStatus(e.target.value)}
              aria-label="Update callback status"
            >
              {MANUAL_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : (
            <span className={queueStatusClass(isDialing ? "CALLING" : item.status)}>
              {isDialing ? "Calling" : queueStatusLabel(item.status)}
            </span>
          )}
        </div>
      </td>
      <td className="hs-callback-queue__actions">
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

        {showOutcome && (
          <div className="hs-callback-queue__outcome">
            <button
              type="button"
              className="hs-callback-queue__outcome-btn hs-callback-queue__outcome-btn--ok"
              onClick={() => void patch({ markResolved: true })}
              disabled={saving}
            >
              <IconCheckCircle size={14} />
              Resolved
            </button>
            <button
              type="button"
              className="hs-callback-queue__outcome-btn hs-callback-queue__outcome-btn--miss"
              onClick={() => void patch({ markNotConnected: true })}
              disabled={saving}
            >
              <IconXCircle size={14} />
              Not connected
            </button>
            <button
              type="button"
              className="hs-callback-queue__outcome-btn hs-callback-queue__outcome-btn--pending"
              onClick={() => void patch({ markPending: true })}
              disabled={saving}
            >
              <IconClock size={14} />
              Pending
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
