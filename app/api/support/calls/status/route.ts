import { NextRequest } from "next/server";
import { updateCallbackCallMeta } from "@/lib/server/store";

export const dynamic = "force-dynamic";

/** Twilio call status webhook — updates callback when call completes or fails. */
export async function POST(req: NextRequest) {
  try {
    const callbackId = req.nextUrl.searchParams.get("callbackId") || "";
    const form = await req.formData();
    const callStatus = String(form.get("CallStatus") || "").toLowerCase();
    const callSid = String(form.get("CallSid") || "");

    if (callbackId) {
      let status: string | undefined;
      if (callStatus === "answered" || callStatus === "in-progress") status = "CONNECTED";
      else if (callStatus === "completed") status = "RESOLVED";
      else if (["no-answer", "busy", "failed", "canceled"].includes(callStatus)) status = "NOT_CONNECTED";

      const note = `Twilio ${callStatus}${callSid ? ` · ${callSid}` : ""} · ${new Date().toISOString()}`;
      await updateCallbackCallMeta(callbackId, {
        twilioCallSid: callSid || undefined,
        lastCallAttemptAt: new Date(),
        ...(status ? { status } : {}),
        callNotes: note,
      });
    }

    return new Response("OK", { status: 200 });
  } catch {
    return new Response("OK", { status: 200 });
  }
}
