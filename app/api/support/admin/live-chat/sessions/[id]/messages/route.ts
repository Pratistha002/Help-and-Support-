import { NextRequest } from "next/server";
import { listLiveMessages, sendLiveMessage } from "@/lib/server/store";
import { json, errorResponse, requireAdmin } from "@/lib/server/http";
import { routeId } from "@/lib/server/routeParams";

export async function GET(_req: NextRequest, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  try {
    await requireAdmin(_req);
    const id = await routeId(params);
    return json(await listLiveMessages(id));
  } catch (e: any) {
    const status = e?.message === "Login required" ? 401 : e?.message?.includes("Admin") ? 403 : 500;
    return errorResponse(e?.message || "Failed", status);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(req);
    const id = await routeId(params);
    const body = await req.json();
    const content = String(body.content || "").trim();
    if (!content) return errorResponse("Message required");
    const msg = await sendLiveMessage(id, "ADMIN", content, admin.sub, admin.fullName || admin.email);
    return json(msg);
  } catch (e: any) {
    const status = e?.message === "Login required" ? 401 : e?.message?.includes("Admin") ? 403 : 500;
    return errorResponse(e?.message || "Send failed", status);
  }
}
