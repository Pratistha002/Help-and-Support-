import { NextRequest } from "next/server";
import { getCustomerHistory } from "@/lib/server/store";
import { json, errorResponse, requireAdmin } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const phone = req.nextUrl.searchParams.get("phone") || undefined;
    const email = req.nextUrl.searchParams.get("email") || undefined;
    if (!phone && !email) return errorResponse("phone or email is required", 400);
    return json(await getCustomerHistory({ phone, email }));
  } catch (e: any) {
    const status = e?.message === "Login required" ? 401 : e?.message?.includes("Admin") ? 403 : 500;
    return errorResponse(e?.message || "Failed", status);
  }
}
