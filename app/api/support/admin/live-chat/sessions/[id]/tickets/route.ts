import { NextRequest } from "next/server";
import { listTicketsByLiveChatSessionId } from "@/lib/server/store";
import { json, errorResponse, requireAdmin } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(_req);
    const tickets = await listTicketsByLiveChatSessionId(params.id);
    return json(tickets);
  } catch (e: any) {
    const status = e?.message === "Login required" ? 401 : e?.message?.includes("Admin") ? 403 : 500;
    return errorResponse(e?.message || "Failed", status);
  }
}
