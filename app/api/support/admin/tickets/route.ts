import { NextRequest } from "next/server";
import { listAgentRaisedTickets, listAllTickets } from "@/lib/server/store";
import { json, errorResponse, requireAdmin } from "@/lib/server/http";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const raisedByAgent = req.nextUrl.searchParams.get("raisedByAgent") === "true";
    if (raisedByAgent) {
      return json(await listAgentRaisedTickets());
    }
    const channel = req.nextUrl.searchParams.get("channel") || undefined;
    const status = req.nextUrl.searchParams.get("status") || undefined;
    return json(await listAllTickets(channel, status));
  } catch (e: any) {
    const status = e?.message === "Login required" ? 401 : e?.message?.includes("Admin") ? 403 : 500;
    return errorResponse(e?.message || "Failed", status);
  }
}
