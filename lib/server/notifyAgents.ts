import { listSupportAgentsForNotify } from "./store";
import { sendPlainTextMail } from "./mail";
import { isMailConfigured, serverEnv } from "./env";

/** Email all registered help agents when a new ticket is created. */
export async function notifyRegisteredAgentsOnNewTicket(ticket: {
  ticketNumber: string;
  email: string;
  name?: string;
  phone?: string;
  subject: string;
  description: string;
  channel?: string;
}) {
  const warnings: string[] = [];
  if (!isMailConfigured()) return warnings;

  const agents = await listSupportAgentsForNotify();
  if (!agents.length) return warnings;

  const channelLabel = ticket.channel === "TICKET_FORM" ? "Form"
    : ticket.channel === "EMAIL" ? "Email"
    : ticket.channel || "Support";

  const body = [
    `A new ${channelLabel} ticket needs attention.`,
    "",
    `Ticket: ${ticket.ticketNumber}`,
    `Customer: ${ticket.name || ticket.email}`,
    `Email: ${ticket.email}`,
    ticket.phone ? `Phone: ${ticket.phone}` : "",
    `Subject: ${ticket.subject}`,
    "",
    "Message:",
    ticket.description,
    "",
    `Open the Help Admin dashboard: ${serverEnv.appFrontendUrl}/admin/`,
    "",
    `— ${serverEnv.companyName} Support`,
  ].filter(Boolean).join("\n");

  for (const agent of agents) {
    const err = await sendPlainTextMail({
      to: agent.email,
      subject: `[${serverEnv.companyName} Support] New ticket ${ticket.ticketNumber} — ${ticket.subject}`,
      text: body,
      replyTo: serverEnv.supportEmailTo,
    });
    if (err) warnings.push(`Agent notify ${agent.email}: ${err}`);
  }

  return warnings;
}
