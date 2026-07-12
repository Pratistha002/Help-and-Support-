import { NextRequest } from "next/server";
import { getTicketStatusCounts } from "@/lib/server/store";
import { json, errorResponse, requireAdmin } from "@/lib/server/http";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    return json(await getTicketStatusCounts());
  } catch (e: any) {
    const status = e?.message === "Login required" ? 401 : e?.message?.includes("Admin") ? 403 : 500;
    return errorResponse(e?.message || "Failed", status);
  }
}
