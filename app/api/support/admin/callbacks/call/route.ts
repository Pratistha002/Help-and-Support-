import { NextRequest } from "next/server";
import {
  getCallbackById,
  updateCallbackCallMeta,
} from "@/lib/server/store";
import { initiateCallbackCall } from "@/lib/server/twilio";
import { initiateSoftphoneCallback } from "@/lib/server/twilioVoice";
import { json, errorResponse, requireAdmin } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const id = String(body.id || "");
    const adminPhone = String(body.adminPhone || "").trim();
    const adminOnline = body.adminOnline !== false;
    const mode = String(body.mode || "phone");
    const adminIdentity = String(body.adminIdentity || "").trim();

    if (!id) return errorResponse("Callback id required");
    if (!adminOnline) return errorResponse('Mark yourself as "online for callbacks" before placing a call');

    const callback = await getCallbackById(id);
    if (!callback) return errorResponse("Callback not found", 404);

    if (mode === "softphone") {
      if (!adminIdentity) return errorResponse("Softphone identity missing — refresh and go online again");

      const result = await initiateSoftphoneCallback({
        customerPhone: callback.phone,
        callbackId: id,
        adminIdentity,
      });

      if (!result.ok) return errorResponse(result.error || "Could not start call", 502);

      const updated = await updateCallbackCallMeta(id, {
        twilioCallSid: result.sid,
        adminPhone: "browser-softphone",
        lastCallAttemptAt: new Date(),
        status: "PENDING",
        callNotes: `Softphone calling ${callback.phone} · ${new Date().toISOString()}`,
      });

      return json({
        success: true,
        callSid: result.sid,
        message: "Calling customer — your browser will connect when they answer.",
        callback: updated,
      });
    }

    if (!adminPhone) return errorResponse("Enter your phone number to receive the connected call");

    const result = await initiateCallbackCall({
      customerPhone: callback.phone,
      callbackId: id,
      adminPhone,
    });

    if (!result.ok) return errorResponse(result.error || "Could not start call", 502);

    const updated = await updateCallbackCallMeta(id, {
      twilioCallSid: result.sid,
      adminPhone,
      lastCallAttemptAt: new Date(),
      status: "PENDING",
      callNotes: "Outbound callback initiated by admin",
    });

    return json({
      success: true,
      callSid: result.sid,
      message: "Calling customer — answer your phone when it rings to be connected.",
      callback: updated,
    });
  } catch (e: any) {
    const status = e?.message === "Login required" ? 401 : e?.message?.includes("Admin") ? 403 : 500;
    return errorResponse(e?.message || "Callback failed", status);
  }
}
