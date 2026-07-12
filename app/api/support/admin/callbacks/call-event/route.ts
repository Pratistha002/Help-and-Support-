import { NextRequest } from "next/server";
import { getCallbackById, updateCallbackCallMeta } from "@/lib/server/store";
import { json, errorResponse, requireAdmin } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Browser softphone events — update callback status when admin connects or ends a call. */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const id = String(body.callbackId || "");
    const event = String(body.event || "");
    const callSid = body.callSid ? String(body.callSid) : undefined;

    if (!id || !event) return errorResponse("callbackId and event are required");

    const callback = await getCallbackById(id);
    if (!callback) return errorResponse("Callback not found", 404);

    let status: string | undefined;
    let callNotes = `Softphone ${event} · ${new Date().toISOString()}`;

    if (event === "connecting") {
      callNotes = `Softphone calling ${callback.phone} · ${new Date().toISOString()}`;
    } else if (event === "connected") {
      status = "CONNECTED";
      callNotes = `Customer answered — admin on softphone · ${new Date().toISOString()}`;
    } else if (event === "disconnected") {
      callNotes = `Softphone call ended · ${new Date().toISOString()}`;
    } else if (event === "failed") {
      status = "NOT_CONNECTED";
      callNotes = `Softphone call failed · ${new Date().toISOString()}`;
    }

    const updated = await updateCallbackCallMeta(id, {
      twilioCallSid: callSid,
      lastCallAttemptAt: new Date(),
      adminPhone: "browser-softphone",
      ...(status ? { status } : {}),
      callNotes,
    });

    return json({ success: true, callback: updated });
  } catch (e: any) {
    const status = e?.message === "Login required" ? 401 : e?.message?.includes("Admin") ? 403 : 500;
    return errorResponse(e?.message || "Call event failed", status);
  }
}
