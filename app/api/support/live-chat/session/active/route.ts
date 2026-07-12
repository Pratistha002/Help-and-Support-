import { NextRequest } from "next/server";
import { getUserActiveSession } from "@/lib/server/store";
import { json, errorResponse, requireUser } from "@/lib/server/http";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    return json(await getUserActiveSession(user.sub));
  } catch (e: any) {
    return errorResponse(e?.message || "Unauthorized", e?.message === "Login required" ? 401 : 403);
  }
}
