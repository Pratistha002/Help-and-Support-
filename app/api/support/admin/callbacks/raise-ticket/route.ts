import { NextRequest } from "next/server";
import {
  createTicket,
  getCallbackById,
  getTicketById,
  findTicketByCallbackRequestId,
  linkCallbackTicket,
} from "@/lib/server/store";
import { notifyNewTicketSubmission } from "@/lib/server/notifyCustomer";
import { json, errorResponse, requireAdmin } from "@/lib/server/http";

export const dynamic = "force-dynamic";

function resolveEmail(raw: string | undefined, fallbackPhone: string): string {
  const email = String(raw || "").trim().toLowerCase();
  if (email && /^[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(email)) return email;
  return `${fallbackPhone.replace(/\D/g, "") || "unknown"}@callback.support`;
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const callbackId = String(body.callbackId || "");
    if (!callbackId) return errorResponse("callbackId required");

    const forceNew = Boolean(body.forceNew);

    const callback = await getCallbackById(callbackId);
    if (!callback) return errorResponse("Callback not found", 404);

    if (!forceNew) {
      if (callback.ticketId) {
        const linked = await getTicketById(String(callback.ticketId));
        if (linked) {
          return json({ ticket: linked, callbackId, reused: true });
        }
      }
      const existing = await findTicketByCallbackRequestId(callbackId);
      if (existing) {
        await linkCallbackTicket(callbackId, String(existing._id), existing.ticketNumber);
        return json({ ticket: existing, callbackId, reused: true });
      }
    }

    const subject = String(body.subject || "").trim();
    const description = String(body.description || "").trim();
    if (!subject || !description) return errorResponse("Subject and description are required");

    const name = String(body.name || callback.callerName || "").trim();
    const phone = String(body.phone || callback.phone || "").trim();
    const email = resolveEmail(body.email || callback.callerEmail, phone);

    const ticket = await createTicket({
      email,
      name,
      subject,
      description,
      category: body.category || "Call",
      consumerType: callback.consumerType || "EMPLOYEE",
      channel: "CALL",
      phone: phone || callback.phone,
      callbackRequestId: callbackId,
    });

    await linkCallbackTicket(callbackId, String(ticket._id), ticket.ticketNumber);
    await notifyNewTicketSubmission({ ...ticket, channel: "CALL" });

    return json({ ticket, callbackId, reused: false });
  } catch (e: any) {
    const status = e?.message === "Login required" ? 401 : e?.message?.includes("Admin") ? 403 : 500;
    return errorResponse(e?.message || "Failed to raise ticket", status);
  }
}
