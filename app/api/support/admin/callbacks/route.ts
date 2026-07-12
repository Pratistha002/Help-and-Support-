import { NextRequest } from "next/server";
import { listCallbackRequests, updateCallbackStatus } from "@/lib/server/store";
import { json, errorResponse, requireAdmin } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const status = req.nextUrl.searchParams.get("status") || undefined;
    return json(await listCallbackRequests(status));
  } catch (e: any) {
    const status = e?.message === "Login required" ? 401 : e?.message?.includes("Admin") ? 403 : 500;
    return errorResponse(e?.message || "Failed", status);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const id = String(body.id || "");
    const status = String(body.status || "");
    if (!id || !status) return errorResponse("id and status are required");
    const updated = await updateCallbackStatus(id, status);
    if (!updated) return errorResponse("Callback not found", 404);
    return json(updated);
  } catch (e: any) {
    const status = e?.message === "Login required" ? 401 : e?.message?.includes("Admin") ? 403 : 500;
    return errorResponse(e?.message || "Failed", status);
  }
}
