import { NextRequest } from "next/server";
import { createTicket, listTicketsForUser } from "@/lib/server/store";
import { notifyNewTicketSubmission } from "@/lib/server/notifyCustomer";
import { json, errorResponse, requireUser } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    return json(await listTicketsForUser(user.sub, user.email));
  } catch (e: any) {
    return errorResponse(e?.message || "Unauthorized", e?.message === "Login required" ? 401 : 403);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const ticket = await createTicket({
      userId: user.sub,
      email: user.email || body.email,
      name: user.fullName || body.name,
      subject: body.subject,
      description: body.description,
      category: body.category || "General",
      consumerType: body.consumerType || user.currentRole || "EMPLOYEE",
      channel: "TICKET_FORM",
      phone: body.phone,
    });

    await notifyNewTicketSubmission({
      ...ticket,
      channel: "TICKET_FORM",
    });

    return json(ticket);
  } catch (e: any) {
    return errorResponse(e?.message || "Create ticket failed", e?.message === "Login required" ? 401 : 500);
  }
}
