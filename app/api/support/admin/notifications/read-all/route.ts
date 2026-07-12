import { NextRequest } from "next/server";
import { markAllAdminNotificationsRead } from "@/lib/server/adminNotifications";
import { json, errorResponse, requireAdmin } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    await markAllAdminNotificationsRead();
    return json({ success: true, unreadCount: 0 });
  } catch (e: any) {
    const status = e?.message === "Login required" ? 401 : e?.message?.includes("Admin") ? 403 : 500;
    return errorResponse(e?.message || "Failed", status);
  }
}
