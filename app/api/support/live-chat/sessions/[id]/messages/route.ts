import { NextRequest } from "next/server";
import { listLiveMessages, sendLiveMessage } from "@/lib/server/store";
import { getOptionalUser, json, errorResponse } from "@/lib/server/http";
import { routeId } from "@/lib/server/routeParams";

export async function GET(_req: NextRequest, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  try {
    const id = await routeId(params);
    return json(await listLiveMessages(id));
  } catch (e: any) {
    return errorResponse(e?.message || "Failed", 500);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  try {
    const user = await getOptionalUser(req);
    const id = await routeId(params);
    const body = await req.json();
    const content = String(body.content || "").trim();
    if (!content) return errorResponse("Message required");
    const isAdmin = user?.accountType === "ADMIN" || user?.currentRole === "HR";
    const senderType = isAdmin ? "ADMIN" : "USER";
    const msg = await sendLiveMessage(id, senderType, content, user?.sub, user?.fullName || user?.email);
    return json(msg);
  } catch (e: any) {
    return errorResponse(e?.message || "Send failed", 400);
  }
}
