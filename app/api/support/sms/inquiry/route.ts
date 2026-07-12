import { NextRequest } from "next/server";
import { createTicket } from "@/lib/server/store";
import { notifyNewTicketSubmission } from "@/lib/server/notifyCustomer";
import { isTwilioSmsConfigured } from "@/lib/server/env";
import { normalizeToE164 } from "@/lib/server/twilio";
import { json, errorResponse } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** User-initiated SMS support — creates a ticket and sends Twilio SMS acknowledgment. */
export async function POST(req: NextRequest) {
  try {
    if (!isTwilioSmsConfigured()) {
      return errorResponse(
        "SMS support is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env.",
        503,
      );
    }

    const body = await req.json();
    const phoneRaw = String(body.phone || "").trim();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const message = String(body.message || body.description || "").trim();
    const subject = String(body.subject || "SMS support inquiry").trim();

    const phone = normalizeToE164(phoneRaw);
    if (!phone) {
      return errorResponse("Enter a valid phone number with country code (e.g. +919876543210)");
    }
    if (!message) return errorResponse("Message is required");

    const ticket = await createTicket({
      email: email || `${phone.replace(/\D/g, "")}@sms.support.local`,
      name: name || "SMS Customer",
      subject,
      description: message,
      category: body.category || "SMS",
      consumerType: body.consumerType || "EMPLOYEE",
      channel: "SMS",
      phone,
    });

    const warnings = await notifyNewTicketSubmission({
      ...ticket,
      channel: "SMS",
    });

    return json({
      ok: true,
      ticketNumber: ticket.ticketNumber,
      ticketId: ticket._id,
      smsSent: isTwilioSmsConfigured() && !warnings.some((w) => /twilio|sms/i.test(w)),
      message: `Ticket ${ticket.ticketNumber} created. A confirmation SMS has been sent to ${phone}.`,
      warnings: warnings.length ? warnings : undefined,
    });
  } catch (e: any) {
    return errorResponse(e?.message || "SMS inquiry failed", 500);
  }
}
