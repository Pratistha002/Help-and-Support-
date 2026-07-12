import { NextRequest } from "next/server";
import { closeTicketByUser } from "@/lib/server/store";
import { json, errorResponse, requireUser } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const ticket = await closeTicketByUser(
      id,
      user.sub,
      user.email,
      user.fullName,
      body?.reason,
    );
    return json({
      ticket,
      message: `Ticket ${ticket.ticketNumber} has been closed.`,
    });
  } catch (e: any) {
    const msg = e?.message || "Could not close ticket";
    const status = msg === "Login required" ? 401 : msg.includes("access") ? 403 : 400;
    return errorResponse(msg, status);
  }
}
