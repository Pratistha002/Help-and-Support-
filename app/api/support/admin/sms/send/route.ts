import { NextRequest } from "next/server";
import { sendTicketSmsToCustomer, sendCallbackSmsToCustomer } from "@/lib/server/notifyCustomer";
import { json, errorResponse, requireAdmin } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = await req.json();
    const ticketId = String(body.ticketId || "");
    const callbackId = String(body.callbackId || "");

    if (callbackId) {
      const result = await sendCallbackSmsToCustomer({
        callbackId,
        templateId: body.templateId,
        message: body.message,
        adminName: admin.fullName || "Admin",
      });
      return json(result);
    }

    if (!ticketId) return errorResponse("ticketId or callbackId is required");

    const result = await sendTicketSmsToCustomer({
      ticketId,
      templateId: body.templateId,
      message: body.message,
      phone: body.phone,
      adminName: admin.fullName || "Admin",
    });
    return json(result);
  } catch (e: any) {
    const status = e?.message === "Login required" ? 401 : e?.message?.includes("Admin") ? 403 : 400;
    return errorResponse(e?.message || "Failed to send SMS", status);
  }
}
