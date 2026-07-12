import { NextRequest } from "next/server";
import { lookupTicketsByEmail } from "@/lib/server/store";
import { json, errorResponse } from "@/lib/server/http";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim();
    if (!email) return errorResponse("Email is required");
    return json(await lookupTicketsByEmail(email));
  } catch (e: any) {
    return errorResponse(e?.message || "Lookup failed", 500);
  }
}
