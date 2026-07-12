"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { appPath } from "@/lib/apiBase";
import { supportApi } from "@/lib/supportApi";
import { buildTicketDashboardStats } from "@/lib/ticketDashboardStats";
import {
  SUPPORT_EMAIL_TEMPLATES,
  SUPPORT_SMS_TEMPLATES,
  renderTemplate,
  buildTemplateVars,
} from "@/lib/supportTemplates";
import { TicketDetailPanel } from "./TicketDetailPanel";
import { StatusTrackingDashboard } from "./StatusTrackingDashboard";
import { StatusTrackingTicketsPanel } from "./StatusTrackingTicketsPanel";
import "./ticket-detail.css";

type AgentUser = { id: string; email: string; fullName: string } | null;

function ticketInAgeRange(ticket: any, ageFilter: string): boolean {
  if (!ageFilter) return true;
  const created = ticket.createdAt ? new Date(ticket.createdAt).getTime() : 0;
  if (!created) return true;
  const now = Date.now();
  const day = 86400000;
  if (ageFilter === "today") return now - created < day;
  if (ageFilter === "7d") return now - created < 7 * day;
  if (ageFilter === "30d") return now - created < 30 * day;
  return true;
}

function ticketAssignedToAgent(ticket: any, agentId?: string, agentEmail?: string) {
  const id = ticket?.assignedAdminId || ticket?.assignedAgentId;
  const email = (ticket?.assignedAdminEmail || ticket?.assignedAgentEmail || "").toLowerCase();
  if (agentId && id && String(id) === String(agentId)) return true;
  if (agentEmail && email && email === agentEmail.toLowerCase()) return true;
  return false;
}

function TicketDetailModal({
  open,
  ticket,
  detail,
  agentUser,
  onClose,
  onAccept,
  onStatusChange,
  onSendEmail,
  onSendSms,
  accepting,
  actionStatus,
  canUpdateStatus,
  notifyEmail,
  notifySms,
  onNotifyEmailChange,
  onNotifySmsChange,
}: {
  open: boolean;
  ticket: any;
  detail: any;
  agentUser: AgentUser;
  onClose: () => void;
  onAccept: () => void;
  onStatusChange: (status: string) => void;
  onSendEmail: (body: string, templateId: string) => void;
  onSendSms: (message: string, templateId: string, phone?: string) => void;
  accepting: boolean;
  actionStatus: string;
  canUpdateStatus: boolean;
  notifyEmail: boolean;
  notifySms: boolean;
  onNotifyEmailChange: (v: boolean) => void;
  onNotifySmsChange: (v: boolean) => void;
}) {
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !portalReady || !ticket || !detail?.ticket) return null;

  const modal = (
    <div className="tdm" role="dialog" aria-modal="true">
      <button type="button" className="tdm__backdrop" onClick={onClose} aria-label="Close ticket details" />
      <div className="tdm__sheet">
        <TicketDetailPanel
          ticket={ticket}
          detail={detail}
          agentUser={agentUser}
          onClose={onClose}
          onAccept={onAccept}
          onStatusChange={onStatusChange}
          onSendEmail={onSendEmail}
          onSendSms={onSendSms}
          accepting={accepting}
          actionStatus={actionStatus}
          canUpdateStatus={canUpdateStatus}
          notifyEmail={notifyEmail}
          notifySms={notifySms}
          onNotifyEmailChange={onNotifyEmailChange}
          onNotifySmsChange={onNotifySmsChange}
        />
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

export function StatusTrackingModule({ agentUser }: { agentUser: AgentUser }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewAllTickets = searchParams.get("view") === "all";

  const [statsCounts, setStatsCounts] = useState<Record<string, number>>({});
  const [tickets, setTickets] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [ageFilter, setAgeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [emailTemplateId, setEmailTemplateId] = useState(SUPPORT_EMAIL_TEMPLATES[0]?.id || "");
  const [smsTemplateId, setSmsTemplateId] = useState(SUPPORT_SMS_TEMPLATES[0]?.id || "");
  const [emailPreview, setEmailPreview] = useState("");
  const [smsPreview, setSmsPreview] = useState("");
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySms, setNotifySms] = useState(false);
  const [actionStatus, setActionStatus] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [acceptingTicketId, setAcceptingTicketId] = useState<string | null>(null);
  const dismissedTicketIdRef = useRef<string | null>(null);

  const agentId = agentUser?.id;
  const agentEmail = agentUser?.email;
  const canUpdateStatus = detail?.ticket
    ? ticketAssignedToAgent(detail.ticket, agentId, agentEmail)
    : false;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t] = await Promise.all([supportApi.adminTicketStats(), supportApi.adminTickets()]);
      setStatsCounts(s);
      setTickets(Array.isArray(t) ? t : []);
    } catch {
      setStatsCounts({});
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 8000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    const urlStatus = searchParams.get("status");
    if (urlStatus) setStatusFilter(urlStatus);
  }, [searchParams]);

  useEffect(() => {
    if (!detail?.ticket) return;
    const vars = buildTemplateVars(detail.ticket);
    const emailTpl = SUPPORT_EMAIL_TEMPLATES.find((t) => t.id === emailTemplateId);
    const smsTpl = SUPPORT_SMS_TEMPLATES.find((t) => t.id === smsTemplateId);
    setEmailPreview(emailTpl ? renderTemplate(emailTpl.body, vars) : "");
    setSmsPreview(smsTpl ? renderTemplate(smsTpl.body, vars) : "");
  }, [detail, emailTemplateId, smsTemplateId]);

  const dashboardStats = useMemo(
    () => buildTicketDashboardStats(tickets, statsCounts),
    [tickets, statsCounts],
  );

  const filteredTickets = useMemo(() => tickets.filter((t) => {
    if (statusFilter && t.status !== statusFilter) return false;
    if (typeFilter && t.consumerType !== typeFilter) return false;
    if (!ticketInAgeRange(t, ageFilter)) return false;
    return true;
  }), [tickets, statusFilter, typeFilter, ageFilter]);

  const setViewAll = (all: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("module", "status-tracking");
    if (all) params.set("view", "all");
    else params.delete("view");
    router.push(`${appPath("admin")}?${params.toString()}`);
  };

  const setStatusFilterUrl = (status: string) => {
    setStatusFilter(status);
    const params = new URLSearchParams(searchParams.toString());
    params.set("module", "status-tracking");
    if (status) params.set("status", status);
    else params.delete("status");
    router.push(`${appPath("admin")}?${params.toString()}`);
  };

  const openTicket = async (t: any) => {
    const id = String(t._id || t.id || "");
    if (id) dismissedTicketIdRef.current = null;
    setSelected(t);
    setActionStatus("");
    try {
      const d = await supportApi.adminTicketDetail(String(t._id));
      setDetail(d);
      const statusTpl = SUPPORT_EMAIL_TEMPLATES.find((x) => x.forStatus === d.ticket.status);
      if (statusTpl) setEmailTemplateId(statusTpl.id);
    } catch {
      setDetail(null);
    }
  };

  useEffect(() => {
    const ticketId = searchParams.get("ticketId");
    if (!ticketId || loading || !tickets.length) return;
    if (dismissedTicketIdRef.current === ticketId) return;
    const match = tickets.find((t) => String(t._id) === ticketId || String(t.id) === ticketId);
    if (match && (!selected || String(selected._id) !== ticketId)) {
      void openTicket(match);
    }
  }, [searchParams, tickets, loading, selected]);

  const closeTicket = () => {
    const ticketId =
      searchParams.get("ticketId") ||
      (selected ? String(selected._id || selected.id || "") : "");
    if (ticketId) dismissedTicketIdRef.current = ticketId;
    setSelected(null);
    setDetail(null);
    setActionStatus("");
    const params = new URLSearchParams(searchParams.toString());
    if (params.has("ticketId")) {
      params.delete("ticketId");
      router.replace(`${appPath("admin")}?${params.toString()}`);
    }
  };

  const refreshDetail = async () => {
    if (!selected?._id) return;
    const d = await supportApi.adminTicketDetail(String(selected._id));
    setDetail(d);
    await load();
    const fresh = (await supportApi.adminTickets()).find((t: any) => String(t._id) === String(selected._id));
    if (fresh) setSelected(fresh);
  };

  const acceptTicket = async (ticketId: string) => {
    setAcceptingTicketId(ticketId);
    setAccepting(true);
    setActionStatus("");
    try {
      await supportApi.adminAcceptTicket(ticketId);
      if (String(selected?._id) === ticketId) await refreshDetail();
      else await load();
      setActionStatus("Ticket accepted");
    } catch (e: any) {
      setActionStatus(e?.message || "Could not accept ticket");
    } finally {
      setAccepting(false);
      setAcceptingTicketId(null);
    }
  };

  const changeStatus = async (status: string) => {
    if (!selected) return;
    setActionStatus("Updating status…");
    try {
      const r = await supportApi.adminUpdateTicketStatus(String(selected._id), status, { notifyEmail, notifySms });
      await refreshDetail();
      const notes: string[] = ["Status updated."];
      if (r.notifications?.email) notes.push(`Email: ${r.notifications.email}`);
      if (r.notifications?.sms) notes.push(`SMS: ${r.notifications.sms}`);
      setActionStatus(notes.join(" "));
    } catch (e: any) {
      setActionStatus(e?.message || "Status update failed");
    }
  };

  const sendEmail = async (body: string, templateId: string) => {
    if (!selected) return;
    setActionStatus("Sending email…");
    try {
      const r = await supportApi.adminSendEmail({ ticketId: String(selected._id), templateId, body });
      setActionStatus(r.message || "Email sent");
      await refreshDetail();
    } catch (e: any) {
      setActionStatus(e?.message || "Email failed");
    }
  };

  const sendSms = async (message: string, templateId: string, phone?: string) => {
    if (!selected) return;
    setActionStatus("Sending SMS…");
    try {
      const payload: Record<string, string> = { ticketId: String(selected._id), templateId, message };
      if (phone) payload.phone = phone;
      const r = await supportApi.adminSendSms(payload);
      setActionStatus(r.message || "SMS sent");
      await refreshDetail();
    } catch (e: any) {
      setActionStatus(e?.message || "SMS failed");
    }
  };

  return (
    <div className="hs-status-tracking">
      {!viewAllTickets && (
        <StatusTrackingDashboard
          stats={dashboardStats}
          loading={loading}
          activeStatusFilter={statusFilter}
          onStatusFilter={setStatusFilterUrl}
          onViewTickets={() => setViewAll(true)}
        />
      )}

      <StatusTrackingTicketsPanel
        allTickets={tickets}
        tickets={filteredTickets}
        loading={loading}
        search={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilterUrl}
        typeFilter={typeFilter}
        onTypeFilter={setTypeFilter}
        ageFilter={ageFilter}
        onAgeFilterChange={setAgeFilter}
        viewAllTickets={viewAllTickets}
        onViewAllTickets={() => setViewAll(true)}
        onShowAnalytics={() => setViewAll(false)}
        onSelect={(t) => void openTicket(t)}
        onAccept={(id) => void acceptTicket(id)}
        acceptingTicketId={acceptingTicketId}
        agentId={agentId}
        agentEmail={agentEmail}
      />

      <TicketDetailModal
        open={Boolean(selected && detail)}
        ticket={selected}
        detail={detail}
        agentUser={agentUser}
        onClose={closeTicket}
        onAccept={() => selected && void acceptTicket(String(selected._id))}
        onStatusChange={changeStatus}
        onSendEmail={sendEmail}
        onSendSms={sendSms}
        accepting={accepting}
        actionStatus={actionStatus}
        canUpdateStatus={canUpdateStatus}
        notifyEmail={notifyEmail}
        notifySms={notifySms}
        onNotifyEmailChange={setNotifyEmail}
        onNotifySmsChange={setNotifySms}
      />
    </div>
  );
}
