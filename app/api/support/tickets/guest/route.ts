import { NextRequest } from "next/server";
import { createTicket } from "@/lib/server/store";
import { notifyNewTicketSubmission } from "@/lib/server/notifyCustomer";
import { json, errorResponse } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ticket = await createTicket({
      email: body.email,
      name: body.name,
      subject: body.subject,
      description: body.description,
      category: body.category || "General",
      consumerType: body.consumerType || "EMPLOYEE",
      channel: "TICKET_FORM",
      phone: body.phone,
    });

    const warnings = await notifyNewTicketSubmission({
      ...ticket,
      channel: "TICKET_FORM",
    });

    return json({
      ...ticket,
      ticketNumber: ticket.ticketNumber,
      notificationsSent: warnings.length === 0,
      warnings: warnings.length ? warnings : undefined,
    });
  } catch (e: any) {
    return errorResponse(e?.message || "Guest ticket failed", 500);
  }
}
