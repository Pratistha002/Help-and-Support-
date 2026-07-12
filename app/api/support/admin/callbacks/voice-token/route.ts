import { NextRequest } from "next/server";
import { createAdminVoiceToken } from "@/lib/server/twilioVoice";
import { json, errorResponse, requireAdmin } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** JWT for Twilio Voice SDK — browser softphone in Call Management. */
export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const identity = `admin-${admin.sub || admin.email || "agent"}`.replace(/[^a-zA-Z0-9_-]/g, "_");
    const result = await createAdminVoiceToken(identity);
    if ("error" in result) return errorResponse(result.error, 503);
    return json(result);
  } catch (e: any) {
    const status = e?.message === "Login required" ? 401 : e?.message?.includes("Admin") ? 403 : 500;
    return errorResponse(e?.message || "Voice token failed", status);
  }
}
