import { statusLabel } from "./ticketConstants";

export type SupportTemplate = {
  id: string;
  label: string;
  subject?: string;
  body: string;
  forStatus?: string;
};

export const SUPPORT_EMAIL_TEMPLATES: SupportTemplate[] = [
  {
    id: "acknowledgment",
    label: "Ticket received",
    subject: "[{{companyName}} Support] Ticket {{ticketNumber}} — We received your request",
    body: `Dear {{customerName}},

Thank you for contacting {{companyName}} Support.

We have received your request regarding "{{subject}}" and assigned ticket {{ticketNumber}} to our team.

Our support team will review your case and respond within 24 hours.

— {{companyName}} Support Team`,
  },
  {
    id: "in_progress",
    label: "We are working on it",
    forStatus: "IN_PROGRESS",
    subject: "[{{companyName}} Support] Ticket {{ticketNumber}} — In progress",
    body: `Dear {{customerName}},

This is an update on ticket {{ticketNumber}}.

Our team is actively working on your issue: "{{subject}}".

Current status: {{statusLabel}}

We will notify you as soon as we have a resolution or need additional information.

Thank you for your patience.

— {{companyName}} Support Team`,
  },
  {
    id: "pending",
    label: "We need more information",
    forStatus: "PENDING",
    subject: "[{{companyName}} Support] Ticket {{ticketNumber}} — Action needed",
    body: `Dear {{customerName}},

We are reviewing ticket {{ticketNumber}} regarding "{{subject}}".

Current status: {{statusLabel}}

We need a little more information from you to proceed. Please reply to this email with any extra details that may help us resolve your issue faster.

— {{companyName}} Support Team`,
  },
  {
    id: "pending_with_user",
    label: "Waiting on your response",
    forStatus: "PENDING_WITH_USER",
    subject: "[{{companyName}} Support] Ticket {{ticketNumber}} — Waiting for you",
    body: `Dear {{customerName}},

Your support ticket {{ticketNumber}} regarding "{{subject}}" is marked as **Pending with User**.

Current status: {{statusLabel}}

We are waiting for your reply or action (for example: confirm details, upload a file, or try the steps we shared). Please respond when you can so we can continue working on your request.

— {{companyName}} Support Team`,
  },
  {
    id: "shortly",
    label: "We will inform you shortly",
    subject: "[{{companyName}} Support] Ticket {{ticketNumber}} — Update coming soon",
    body: `Dear {{customerName}},

Thank you for your patience regarding ticket {{ticketNumber}} ("{{subject}}").

We will inform you shortly with the next update from our support team.

— {{companyName}} Support Team`,
  },
  {
    id: "resolved",
    label: "Ticket resolved",
    forStatus: "RESOLVED",
    subject: "[{{companyName}} Support] Ticket {{ticketNumber}} — Resolved",
    body: `Dear {{customerName}},

Good news — your support ticket {{ticketNumber}} regarding "{{subject}}" has been marked as resolved.

Current status: {{statusLabel}}

If you still need help, reply to this email and we will reopen your case.

— {{companyName}} Support Team`,
  },
  {
    id: "closed",
    label: "Ticket closed",
    forStatus: "CLOSED",
    subject: "[{{companyName}} Support] Ticket {{ticketNumber}} — Closed",
    body: `Dear {{customerName}},

Ticket {{ticketNumber}} ("{{subject}}") has been closed.

Thank you for contacting {{companyName}} Support. If you need further assistance, you can open a new request anytime from Help & Support.

— {{companyName}} Support Team`,
  },
];

export const SUPPORT_SMS_TEMPLATES: SupportTemplate[] = [
  {
    id: "sms_received",
    label: "Ticket received",
    body: "{{companyName}} Support: Ticket {{ticketNumber}} received for \"{{subject}}\". We will respond within 24 hours.",
  },
  {
    id: "sms_agent_assigned",
    label: "Agent assigned",
    body: "{{companyName}} Support: Ticket {{ticketNumber}} has been assigned to an agent. We will update you soon.",
  },
  {
    id: "sms_follow_up",
    label: "Follow-up check-in",
    body: "{{companyName}} Support: Following up on ticket {{ticketNumber}} regarding \"{{subject}}\". Reply if you still need help.",
  },
  {
    id: "sms_in_progress",
    label: "In progress",
    forStatus: "IN_PROGRESS",
    body: "{{companyName}} Support: Ticket {{ticketNumber}} is now In Progress. We are working on your request.",
  },
  {
    id: "sms_shortly",
    label: "Update coming shortly",
    body: "{{companyName}} Support: We will inform you shortly about ticket {{ticketNumber}}.",
  },
  {
    id: "sms_pending",
    label: "Need more info",
    forStatus: "PENDING",
    body: "{{companyName}} Support: Ticket {{ticketNumber}} needs more info. Please check your email and reply.",
  },
  {
    id: "sms_pending_with_user",
    label: "Waiting on you",
    forStatus: "PENDING_WITH_USER",
    body: "{{companyName}} Support: Ticket {{ticketNumber}} is waiting for your reply. Please check your email and respond.",
  },
  {
    id: "sms_resolved",
    label: "Ticket resolved",
    forStatus: "RESOLVED",
    body: "{{companyName}} Support: Ticket {{ticketNumber}} has been resolved. Reply if you need more help.",
  },
  {
    id: "sms_closed",
    label: "Ticket closed",
    forStatus: "CLOSED",
    body: "{{companyName}} Support: Ticket {{ticketNumber}} is closed. Thank you for contacting us.",
  },
  {
    id: "sms_escalated",
    label: "Escalated to specialist",
    forStatus: "ESCALATED",
    body: "{{companyName}} Support: Ticket {{ticketNumber}} has been escalated. Our specialist team will contact you shortly.",
  },
  {
    id: "sms_callback_scheduled",
    label: "Callback scheduled",
    body: "{{companyName}} Support: We will call you shortly about ticket {{ticketNumber}}. Please keep your phone available.",
  },
  {
    id: "sms_custom_update",
    label: "Quick update",
    body: "{{companyName}} Support: Update on ticket {{ticketNumber}} (\"{{subject}}\"): our team is reviewing your case. Thank you for your patience.",
  },
  {
    id: "sms_thanks",
    label: "Thank you",
    body: "{{companyName}} Support: Thank you for contacting us about ticket {{ticketNumber}}. We appreciate your patience.",
  },
];

export type TemplateVars = {
  customerName?: string;
  ticketNumber?: string;
  subject?: string;
  status?: string;
  statusLabel?: string;
  companyName?: string;
};

export function renderTemplate(text: string, vars: TemplateVars): string {
  const merged: Record<string, string> = {
    customerName: vars.customerName || "Customer",
    ticketNumber: vars.ticketNumber || "",
    subject: vars.subject || "Support request",
    status: vars.status || "",
    statusLabel: vars.statusLabel || (vars.status ? statusLabel(vars.status) : ""),
    companyName: vars.companyName || "SaarthiWorkforce",
  };
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => merged[key] ?? "");
}

export function getEmailTemplate(id: string) {
  return SUPPORT_EMAIL_TEMPLATES.find((t) => t.id === id);
}

export function getSmsTemplate(id: string) {
  return SUPPORT_SMS_TEMPLATES.find((t) => t.id === id);
}

export function emailTemplateForStatus(status: string) {
  return SUPPORT_EMAIL_TEMPLATES.find((t) => t.forStatus === status);
}

export function smsTemplateForStatus(status: string) {
  return SUPPORT_SMS_TEMPLATES.find((t) => t.forStatus === status);
}

export function buildTemplateVars(ticket: {
  name?: string;
  email?: string;
  ticketNumber?: string;
  subject?: string;
  status?: string;
}, companyName?: string): TemplateVars {
  return {
    customerName: ticket.name || ticket.email || "Customer",
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    status: ticket.status,
    statusLabel: ticket.status ? statusLabel(ticket.status) : "",
    companyName: companyName || "SaarthiWorkforce",
  };
}

export function buildCallbackTemplateVars(
  callback: {
    _id?: unknown;
    callerName?: string;
    callerEmail?: string;
    phone?: string;
    ticketNumber?: string;
    status?: string;
  },
  companyName?: string,
): TemplateVars {
  const ref =
    callback.ticketNumber ||
    (callback._id ? `CB-${String(callback._id).slice(-6).toUpperCase()}` : "Callback");
  return buildTemplateVars(
    {
      name: callback.callerName,
      email: callback.callerEmail,
      ticketNumber: ref,
      subject: "Callback request",
      status: callback.status,
    },
    companyName,
  );
}
