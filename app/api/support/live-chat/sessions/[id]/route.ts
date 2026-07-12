import { NextRequest } from "next/server";
import { getLiveSession } from "@/lib/server/store";
import { json, errorResponse } from "@/lib/server/http";
import { routeId } from "@/lib/server/routeParams";

export async function GET(_req: NextRequest, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  try {
    const id = await routeId(params);
    const session = await getLiveSession(id);
    if (!session) return errorResponse("Session not found", 404);
    return json(session);
  } catch (e: any) {
    return errorResponse(e?.message || "Failed", 500);
  }
}
