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

async function createCallTicket(body: Record<string, unknown>, opts?: {
  callbackId?: string;
  consumerType?: string;
  fallbackName?: string;
  fallbackPhone?: string;
  fallbackEmail?: string;
}) {
  const subject = String(body.subject || "").trim();
  const description = String(body.description || "").trim();
  if (!subject || !description) throw new Error("Subject and description are required");

  const name = String(body.name || opts?.fallbackName || "").trim();
  const phone = String(body.phone || opts?.fallbackPhone || "").trim();
  if (!name) throw new Error("Customer name is required");
  if (!phone) throw new Error("Customer phone is required");

  const email = resolveEmail(
    String(body.email || opts?.fallbackEmail || ""),
    phone,
  );

  const ticket = await createTicket({
    email,
    name,
    subject,
    description,
    category: String(body.category || "Call"),
    consumerType: opts?.consumerType || "EMPLOYEE",
    channel: "CALL",
    phone,
    callbackRequestId: opts?.callbackId,
    tags: [],
  });

  if (opts?.callbackId) {
    await linkCallbackTicket(opts.callbackId, String(ticket._id), ticket.ticketNumber);
  }

  try {
    await notifyNewTicketSubmission({ ...ticket, channel: "CALL" });
  } catch {
    // Ticket already created — ignore notify failures.
  }

  return ticket;
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const callbackId = String(body.callbackId || "").trim();
    const forceNew = Boolean(body.forceNew);

    // Standalone raise from Call Management (no callback selected).
    if (!callbackId) {
      const ticket = await createCallTicket(body);
      return json({ ticket, callbackId: null, reused: false });
    }

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

    const ticket = await createCallTicket(body, {
      callbackId,
      consumerType: callback.consumerType,
      fallbackName: callback.callerName,
      fallbackPhone: callback.phone,
      fallbackEmail: callback.callerEmail,
    });

    return json({ ticket, callbackId, reused: false });
  } catch (e: any) {
    const msg = e?.message || "Failed to raise ticket";
    const status =
      msg === "Login required"
        ? 401
        : msg.includes("Admin")
          ? 403
          : /required|valid/i.test(msg)
            ? 400
            : 500;
    return errorResponse(msg, status);
  }
}
