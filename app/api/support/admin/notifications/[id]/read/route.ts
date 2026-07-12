import { NextRequest } from "next/server";
import { getAdminUnreadCount, markAdminNotificationRead } from "@/lib/server/adminNotifications";
import { json, errorResponse, requireAdmin } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
    await markAdminNotificationRead(params.id);
    const unreadCount = await getAdminUnreadCount();
    return json({ success: true, unreadCount });
  } catch (e: any) {
    const status = e?.message === "Login required" ? 401 : e?.message?.includes("Admin") ? 403 : 500;
    return errorResponse(e?.message || "Failed", status);
  }
}
