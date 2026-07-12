import { NextRequest } from "next/server";
import { createTicket } from "@/lib/server/store";
import { notifyNewTicketSubmission } from "@/lib/server/notifyCustomer";
import { isMailConfigured } from "@/lib/server/env";
import { json, errorResponse, getOptionalUser } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const subject = String(body.subject || "Email support inquiry").trim();
    const message = String(body.message || body.description || "").trim();

    if (!email || !message) return errorResponse("Email and message are required");
    if (!/^[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(email)) return errorResponse("Valid email is required");

    const user = await getOptionalUser(req);
    const ticket = await createTicket({
      email,
      name,
      subject,
      description: message,
      category: body.category || "Email",
      consumerType: body.consumerType || user?.currentRole || "EMPLOYEE",
      userId: user?.sub,
      channel: "EMAIL",
      phone: body.phone,
    });

    const mailWarnings = await notifyNewTicketSubmission({
      ...ticket,
      channel: "EMAIL",
    });

    return json({
      ok: true,
      ticketNumber: ticket.ticketNumber,
      mailSent: isMailConfigured() && mailWarnings.length === 0,
      mailConfigured: isMailConfigured(),
      message: isMailConfigured()
        ? `Your request was received. Ticket ${ticket.ticketNumber} was created. A confirmation email has been sent.`
        : `Ticket ${ticket.ticketNumber} was created. Email delivery is not configured — set BREVO_API_KEY in .env.`,
      warnings: mailWarnings.length ? mailWarnings : undefined,
    });
  } catch (e: any) {
    return errorResponse(e?.message || "Email inquiry failed", 500);
  }
}
