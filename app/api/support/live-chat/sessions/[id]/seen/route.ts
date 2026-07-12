import { NextRequest } from "next/server";
import { markLiveSeen } from "@/lib/server/store";
import { getOptionalUser, json, errorResponse } from "@/lib/server/http";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getOptionalUser(req);
    const isAdmin = user?.accountType === "ADMIN" || user?.currentRole === "HR";
    await markLiveSeen(params.id, isAdmin ? "admin" : "user");
    return json({ ok: true });
  } catch (e: any) {
    return errorResponse(e?.message || "Failed", 500);
  }
}
