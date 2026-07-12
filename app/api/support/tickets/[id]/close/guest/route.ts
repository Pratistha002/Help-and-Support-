import { NextRequest } from "next/server";
import { closeTicketByGuest } from "@/lib/server/store";
import { json, errorResponse } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const email = String(body?.email || "").trim();
    if (!email) return errorResponse("Email is required");
    const ticket = await closeTicketByGuest(id, email, body?.reason);
    return json({
      ticket,
      message: `Ticket ${ticket.ticketNumber} has been closed.`,
    });
  } catch (e: any) {
    return errorResponse(e?.message || "Could not close ticket", 400);
  }
}
