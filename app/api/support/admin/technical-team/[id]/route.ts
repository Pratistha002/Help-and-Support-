import { NextRequest } from "next/server";
import { deactivateTechnicalMember, updateTechnicalMember } from "@/lib/server/store";
import { json, errorResponse, requireAdmin } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const member = await updateTechnicalMember(params.id, body);
    if (!member) return errorResponse("Member not found", 404);
    return json(member);
  } catch (e: any) {
    const status = e?.message === "Login required" ? 401 : e?.message?.includes("Admin") ? 403 : 500;
    return errorResponse(e?.message || "Failed", status);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(_req);
    const member = await deactivateTechnicalMember(params.id);
    if (!member) return errorResponse("Member not found", 404);
    return json({ success: true, member });
  } catch (e: any) {
    const status = e?.message === "Login required" ? 401 : e?.message?.includes("Admin") ? 403 : 500;
    return errorResponse(e?.message || "Failed", status);
  }
}
