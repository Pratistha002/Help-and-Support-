import { NextRequest } from "next/server";
import { getTicketById, updateTicketStatus, getTicketMessages } from "@/lib/server/store";
import { notifyCustomerOnStatusChange } from "@/lib/server/notifyCustomer";
import { serverEnv } from "@/lib/server/env";
import { json, errorResponse, requireAdmin } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(_req);
    const ticket = await getTicketById(params.id);
    if (!ticket) return errorResponse("Ticket not found", 404);
    const messages = await getTicketMessages(params.id);
    return json({ ticket, messages });
  } catch (e: any) {
    const status = e?.message === "Login required" ? 401 : e?.message?.includes("Admin") ? 403 : 500;
    return errorResponse(e?.message || "Failed", status);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin(req);
    const body = await req.json();
    const status = String(body.status || "").trim();
    if (!status) return errorResponse("Status required");

    const isSuperAdmin = admin.fullName === "ADMIN" && admin.email === serverEnv.adminEmail;
    const ticket = await updateTicketStatus(
      params.id,
      status,
      admin.fullName || "Admin",
      { id: admin.sub, email: admin.email },
      isSuperAdmin,
    );
    if (!ticket) return errorResponse("Ticket not found", 404);

    let notifications: { email?: string; sms?: string } | undefined;
    if (body.notifyEmail || body.notifySms) {
      notifications = await notifyCustomerOnStatusChange({
        ticketId: params.id,
        status,
        notifyEmail: Boolean(body.notifyEmail),
        notifySms: Boolean(body.notifySms),
        adminName: admin.fullName || "Admin",
      });
    }

    return json({ ticket, notifications });
  } catch (e: any) {
    const status = e?.message === "Login required" ? 401 : e?.message?.includes("Admin") ? 403 : 500;
    return errorResponse(e?.message || "Failed", status);
  }
}
