import type { TicketDoc, TechnicalTeamMemberDoc } from "./store";
import { addTicketMessage } from "./store";
import { sendPlainTextMail } from "./mail";
import { sendSms, normalizeToE164 } from "./twilio";
import { isMailConfigured, isTwilioSmsConfigured, serverEnv } from "./env";

function buildTechnicalAssignmentEmailBody(opts: {
  memberName: string;
  ticketNumber: string;
  subject: string;
  priority: string;
  role: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  consumerType: string;
  description: string;
  escalatedByName: string;
  escalatedByEmail: string;
  escalationNote?: string | null;
}) {
  const lines = [
    `Hello ${opts.memberName},`,
    "",
    "A support ticket has been assigned to you for technical resolution.",
    "",
    `Ticket: ${opts.ticketNumber}`,
    `Subject: ${opts.subject}`,
    `Priority: ${opts.priority}`,
    `Your role: ${opts.role}`,
    "",
    "Customer details:",
    `  Name: ${opts.customerName}`,
    `  Email: ${opts.customerEmail}`,
    `  Phone: ${opts.customerPhone}`,
    `  User type: ${opts.consumerType}`,
    "",
    "Issue description:",
    opts.description,
    "",
    `Escalated by: ${opts.escalatedByName}${opts.escalatedByEmail && opts.escalatedByEmail !== "—" ? ` (${opts.escalatedByEmail})` : ""}`,
  ];
  if (opts.escalationNote) {
    lines.push("", "Escalation note:", opts.escalationNote);
  }
  lines.push("", `— ${serverEnv.companyName} Help & Support`);
  return lines.join("\n");
}

export async function notifyTechnicalMemberAssigned(
  ticket: TicketDoc,
  member: TechnicalTeamMemberDoc & { id: string },
  adminName: string,
) {
  const result: { emailSent: boolean; smsSent: boolean; emailError?: string; smsError?: string } = {
    emailSent: false,
    smsSent: false,
  };

  const ticketNumber = ticket.ticketNumber || String(ticket.id || ticket._id);
  const customerName = ticket.name || ticket.userName || "—";
  const customerEmail = ticket.email || "—";
  const customerPhone = ticket.phone || "—";
  const priority = (ticket.priority || "NORMAL").replace(/_/g, " ");
  const role = member.designation || member.specialty || "Technical specialist";
  const description = ticket.description?.trim() || "No description provided.";
  const escalatedByName = ticket.escalatedByAdminName?.trim() || adminName || "Support Admin";
  const escalatedByEmail = ticket.escalatedByAdminEmail?.trim() || "—";

  const emailSubject = `[${serverEnv.companyName} Technical] Ticket assigned — ${ticketNumber}`;
  const emailBody = buildTechnicalAssignmentEmailBody({
    memberName: member.name,
    ticketNumber,
    subject: ticket.subject || "—",
    priority,
    role,
    customerName,
    customerEmail,
    customerPhone,
    consumerType: ticket.consumerType || "—",
    description,
    escalatedByName,
    escalatedByEmail,
    escalationNote: ticket.escalationNote,
  });

  if (member.email && isMailConfigured()) {
    const err = await sendPlainTextMail({ to: member.email, subject: emailSubject, text: emailBody });
    if (err) {
      result.emailError = err;
    } else {
      result.emailSent = true;
    }
  } else if (!member.email) {
    result.emailError = "Assignee has no email";
  } else {
    result.emailError = "Outbound email is not configured";
  }

  const phone = normalizeToE164(member.phone || ticket.assignedTechnicalMemberPhone || "");
  if (phone && isTwilioSmsConfigured()) {
    let issue = ticket.subject || "Support ticket";
    if (issue.length > 45) issue = `${issue.slice(0, 42)}...`;
    let smsBody = `${serverEnv.companyName}: Ticket ${ticketNumber} assigned to you. ${issue}. Details sent to your email.`;
    if (smsBody.length > 155) smsBody = `${smsBody.slice(0, 152)}...`;
    const smsResult = await sendSms(phone, smsBody);
    if (smsResult.ok) {
      result.smsSent = true;
    } else {
      result.smsError = smsResult.error || "SMS delivery failed";
    }
  } else if (!phone) {
    result.smsError = "Assignee has no phone number";
  } else {
    result.smsError = "SMS is not configured";
  }

  const notes: string[] = ["Assignee notified —"];
  notes.push(`email: ${result.emailSent}`);
  notes.push(`SMS: ${result.smsSent}`);
  await addTicketMessage(
    String(ticket.id || ticket._id),
    "ADMIN",
    `[Internal] ${notes.join(" ")}`,
    escalatedByName,
  );

  return result;
}
