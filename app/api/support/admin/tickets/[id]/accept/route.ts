import { NextRequest } from "next/server";
import { assignTicketToAgent } from "@/lib/server/store";
import { json, errorResponse, requireAdmin } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin(req);
    const ticket = await assignTicketToAgent(params.id, {
      id: admin.sub,
      name: admin.fullName || admin.email,
      email: admin.email,
    });
    if (!ticket) return errorResponse("Ticket not found", 404);
    return json({ success: true, ticket });
  } catch (e: any) {
    const status = e?.message === "Login required" ? 401
      : e?.message?.includes("Admin") ? 403
      : e?.message?.includes("assigned") ? 409
      : 500;
    return errorResponse(e?.message || "Could not accept ticket", status);
  }
}
