import { getTicketById, addTicketMessage, getCallbackById, updateCallbackCallMeta } from "./store";
import { sendPlainTextMail } from "./mail";
import { sendSms, smsAckMessage, normalizeToE164 } from "./twilio";
import { isMailConfigured, isTwilioSmsConfigured, serverEnv } from "./env";
import {
  buildTemplateVars,
  renderTemplate,
  getEmailTemplate,
  getSmsTemplate,
  emailTemplateForStatus,
  smsTemplateForStatus,
  buildCallbackTemplateVars,
} from "../supportTemplates";

export async function sendTicketEmailToCustomer(opts: {
  ticketId: string;
  templateId?: string;
  subject?: string;
  body?: string;
  adminName?: string;
}) {
  const ticket = await getTicketById(opts.ticketId);
  if (!ticket) throw new Error("Ticket not found");
  if (!isMailConfigured()) throw new Error("Email (Brevo) is not configured");

  const vars = buildTemplateVars(ticket, serverEnv.companyName);
  let subject = opts.subject || "";
  let body = opts.body || "";

  if (opts.templateId) {
    const tpl = getEmailTemplate(opts.templateId);
    if (!tpl) throw new Error("Email template not found");
    subject = renderTemplate(tpl.subject || `Update on ticket ${ticket.ticketNumber}`, vars);
    body = renderTemplate(tpl.body, vars);
  }

  if (!body.trim()) throw new Error("Email message is required");

  const err = await sendPlainTextMail({
    to: ticket.email,
    subject: subject || `[${serverEnv.companyName} Support] Ticket ${ticket.ticketNumber}`,
    text: body,
    replyTo: serverEnv.supportEmailTo,
  });
  if (err) throw new Error(err);

  await addTicketMessage(
    opts.ticketId,
    "ADMIN",
    `[Email sent to customer]\nSubject: ${subject || "—"}\n\n${body}`,
    opts.adminName || "Admin",
  );

  return { success: true, message: `Email sent to ${ticket.email}` };
}

export async function sendTicketSmsToCustomer(opts: {
  ticketId: string;
  templateId?: string;
  message?: string;
  phone?: string;
  adminName?: string;
}) {
  const ticket = await getTicketById(opts.ticketId);
  if (!ticket) throw new Error("Ticket not found");
  if (!isTwilioSmsConfigured()) throw new Error("Twilio SMS is not configured");

  const phone = normalizeToE164(opts.phone || ticket.phone);
  if (!phone) throw new Error("Valid phone number is required on the ticket");

  const vars = buildTemplateVars(ticket, serverEnv.companyName);
  let text = opts.message || "";
  if (opts.templateId) {
    const tpl = getSmsTemplate(opts.templateId);
    if (!tpl) throw new Error("SMS template not found");
    text = renderTemplate(tpl.body, vars);
  }
  if (!text.trim()) throw new Error("SMS message is required");

  const result = await sendSms(phone, text);
  if (!result.ok) throw new Error(result.error || "SMS failed");

  await addTicketMessage(
    opts.ticketId,
    "ADMIN",
    `[SMS sent to ${phone}]\n${text}`,
    opts.adminName || "Admin",
  );

  return { success: true, message: `SMS sent to ${phone}`, sid: result.sid };
}

export async function sendCallbackEmailToCustomer(opts: {
  callbackId: string;
  templateId?: string;
  subject?: string;
  body?: string;
  adminName?: string;
}) {
  const callback = await getCallbackById(opts.callbackId);
  if (!callback) throw new Error("Callback not found");
  const email = String(callback.callerEmail || "").trim();
  if (!email) throw new Error("This callback has no email address");
  if (!isMailConfigured()) throw new Error("Email (Brevo) is not configured");

  const vars = buildCallbackTemplateVars(callback, serverEnv.companyName);
  let subject = opts.subject || "";
  let body = opts.body || "";

  if (opts.templateId) {
    const tpl = getEmailTemplate(opts.templateId);
    if (!tpl) throw new Error("Email template not found");
    subject = renderTemplate(tpl.subject || `Update on callback ${vars.ticketNumber}`, vars);
    body = renderTemplate(tpl.body, vars);
  }

  if (!body.trim()) throw new Error("Email message is required");

  const ref = vars.ticketNumber;
  const err = await sendPlainTextMail({
    to: email,
    subject: subject || `[${serverEnv.companyName} Support] Callback ${ref}`,
    text: body,
    replyTo: serverEnv.supportEmailTo,
  });
  if (err) throw new Error(err);

  if (callback.ticketId) {
    await addTicketMessage(
      String(callback.ticketId),
      "ADMIN",
      `[Email sent to ${email}]\nSubject: ${subject || "—"}\n\n${body}`,
      opts.adminName || "Admin",
    );
  } else {
    await updateCallbackCallMeta(opts.callbackId, {
      callNotes: `Email sent to ${email} · ${new Date().toISOString()}`,
    });
  }

  return { success: true, message: `Email sent to ${email}` };
}

export async function sendCallbackSmsToCustomer(opts: {
  callbackId: string;
  templateId?: string;
  message?: string;
  adminName?: string;
}) {
  const callback = await getCallbackById(opts.callbackId);
  if (!callback) throw new Error("Callback not found");
  if (!isTwilioSmsConfigured()) throw new Error("Twilio SMS is not configured");

  const phone = normalizeToE164(callback.phone);
  if (!phone) throw new Error("Valid phone number is required on the callback");

  const vars = buildCallbackTemplateVars(callback, serverEnv.companyName);
  let text = opts.message || "";
  if (opts.templateId) {
    const tpl = getSmsTemplate(opts.templateId);
    if (!tpl) throw new Error("SMS template not found");
    text = renderTemplate(tpl.body, vars);
  }
  if (!text.trim()) throw new Error("SMS message is required");

  const result = await sendSms(phone, text);
  if (!result.ok) throw new Error(result.error || "SMS failed");

  if (callback.ticketId) {
    await addTicketMessage(
      String(callback.ticketId),
      "ADMIN",
      `[SMS sent to ${phone}]\n${text}`,
      opts.adminName || "Admin",
    );
  } else {
    await updateCallbackCallMeta(opts.callbackId, {
      callNotes: `SMS sent to ${phone} · ${new Date().toISOString()}`,
    });
  }

  return { success: true, message: `SMS sent to ${phone}`, sid: result.sid };
}

export async function notifyCustomerOnStatusChange(opts: {
  ticketId: string;
  status: string;
  notifyEmail?: boolean;
  notifySms?: boolean;
  adminName?: string;
}) {
  const ticket = await getTicketById(opts.ticketId);
  if (!ticket) throw new Error("Ticket not found");

  const results: { email?: string; sms?: string } = {};

  if (opts.notifyEmail) {
    const tpl = emailTemplateForStatus(opts.status);
    if (tpl) {
      try {
        const r = await sendTicketEmailToCustomer({
          ticketId: opts.ticketId,
          templateId: tpl.id,
          adminName: opts.adminName,
        });
        results.email = r.message;
      } catch (e: any) {
        results.email = e?.message || "Email failed";
      }
    } else {
      results.email = "No email template for this status";
    }
  }

  if (opts.notifySms && ticket.phone) {
    const tpl = smsTemplateForStatus(opts.status);
    if (tpl) {
      try {
        const r = await sendTicketSmsToCustomer({
          ticketId: opts.ticketId,
          templateId: tpl.id,
          adminName: opts.adminName,
        });
        results.sms = r.message;
      } catch (e: any) {
        results.sms = e?.message || "SMS failed";
      }
    } else {
      results.sms = "No SMS template for this status";
    }
  }

  return results;
}

/** Customer + admin notifications when a new ticket is submitted (form, email, etc.) */
export async function notifyNewTicketSubmission(ticket: {
  _id?: unknown;
  ticketNumber: string;
  email: string;
  name?: string;
  phone?: string;
  subject: string;
  description: string;
  channel?: string;
}) {
  const channelLabel = ticket.channel === "TICKET_FORM" ? "Form" : ticket.channel === "EMAIL" ? "Email" : ticket.channel || "Support";
  const warnings: string[] = [];

  if (isMailConfigured()) {
    const ackTpl = getEmailTemplate("acknowledgment");
    const vars = buildTemplateVars(ticket, serverEnv.companyName);
    const ackErr = await sendPlainTextMail({
      to: ticket.email,
      subject: ackTpl?.subject
        ? renderTemplate(ackTpl.subject, vars)
        : `[${serverEnv.companyName} Support] Ticket ${ticket.ticketNumber} — We received your request`,
      text: renderTemplate(
        ackTpl?.body ||
          "Dear {{customerName}},\n\nTicket {{ticketNumber}} was created.\n\n— {{companyName}} Support",
        vars,
      ),
      replyTo: serverEnv.supportEmailTo,
    });
    if (ackErr) warnings.push(ackErr);

    const { notifySupportInbox } = await import("./mail");
    const inboxErr = await notifySupportInbox({
      ticketNumber: ticket.ticketNumber,
      channel: channelLabel,
      name: ticket.name,
      email: ticket.email,
      phone: ticket.phone,
      subject: ticket.subject,
      message: ticket.description,
    });
    if (inboxErr) warnings.push(inboxErr);

    const { notifyRegisteredAgentsOnNewTicket } = await import("./notifyAgents");
    const agentWarnings = await notifyRegisteredAgentsOnNewTicket(ticket);
    warnings.push(...agentWarnings);
  }

  try {
    const { notifyAdminNewTicket } = await import("./adminNotifications");
    await notifyAdminNewTicket(ticket);
  } catch {
    /* non-blocking */
  }

  if (isTwilioSmsConfigured() && ticket.phone) {
    const phone = normalizeToE164(ticket.phone);
    if (phone) {
      const sms = await sendSms(phone, smsAckMessage(ticket.ticketNumber, serverEnv.companyName));
      if (!sms.ok && sms.error) warnings.push(sms.error);
    }
  }

  return warnings;
}
