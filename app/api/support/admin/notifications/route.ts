import { NextRequest } from "next/server";
import { getAdminNotifications, getAdminUnreadCount } from "@/lib/server/adminNotifications";
import { json, errorResponse, requireAdmin } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const [notifications, unreadCount] = await Promise.all([
      getAdminNotifications(),
      getAdminUnreadCount(),
    ]);
    return json({ notifications, unreadCount });
  } catch (e: any) {
    const status = e?.message === "Login required" ? 401 : e?.message?.includes("Admin") ? 403 : 500;
    return errorResponse(e?.message || "Failed", status);
  }
}
