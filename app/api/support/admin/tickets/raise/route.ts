import { NextRequest } from "next/server";
import {
  ADMIN_AGENT_RAISED_TAG,
  createTicket,
  LIVE_CHAT_RAISE_TICKET_TAG,
} from "@/lib/server/store";
import { notifyNewTicketSubmission } from "@/lib/server/notifyCustomer";
import { json, errorResponse, requireAdmin } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    if (!email || !/^[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(email)) {
      return errorResponse("Valid customer email is required");
    }
    const subject = String(body.subject || "").trim();
    const description = String(body.description || "").trim();
    if (!subject || !description) return errorResponse("Subject and description are required");

    const liveChatSessionId = body.liveChatSessionId ? String(body.liveChatSessionId) : undefined;
    if (!liveChatSessionId) {
      return errorResponse("liveChatSessionId is required — raise call tickets from Call Management instead");
    }

    const tags = [LIVE_CHAT_RAISE_TICKET_TAG, ADMIN_AGENT_RAISED_TAG];

    const ticket = await createTicket({
      email,
      name: body.name ? String(body.name).trim() : undefined,
      subject,
      description,
      category: body.category || "General",
      consumerType: body.consumerType || "EMPLOYEE",
      userId: body.userId,
      channel: "LIVE_CHAT",
      liveChatSessionId,
      phone: body.phone ? String(body.phone).trim() : undefined,
      tags,
    });

    try {
      await notifyNewTicketSubmission({
        ...ticket,
        channel: "LIVE_CHAT",
      });
    } catch {
      // Ticket already created.
    }

    return json(ticket);
  } catch (e: any) {
    const status = e?.message === "Login required" ? 401 : e?.message?.includes("Admin") ? 403 : 500;
    return errorResponse(e?.message || "Failed", status);
  }
}
