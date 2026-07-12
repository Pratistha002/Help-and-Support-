import { NextRequest } from "next/server";
import { listAdminLiveSessions } from "@/lib/server/store";
import { json, errorResponse, requireAdmin } from "@/lib/server/http";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    return json(await listAdminLiveSessions());
  } catch (e: any) {
    const status = e?.message === "Login required" ? 401 : e?.message?.includes("Admin") ? 403 : 500;
    return errorResponse(e?.message || "Failed", status);
  }
}
