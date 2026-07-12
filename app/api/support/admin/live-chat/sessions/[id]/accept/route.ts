import { NextRequest } from "next/server";
import { acceptLiveSession } from "@/lib/server/store";
import { json, errorResponse, requireAdmin } from "@/lib/server/http";
import { routeId } from "@/lib/server/routeParams";

export async function POST(req: NextRequest, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(req);
    const id = await routeId(params);
    const session = await acceptLiveSession(id, {
      id: admin.sub,
      fullName: admin.fullName,
      email: admin.email,
    });
    return json(session);
  } catch (e: any) {
    const status = e?.message === "Login required" ? 401 : e?.message?.includes("Admin") ? 403 : 500;
    return errorResponse(e?.message || "Accept failed", status);
  }
}
