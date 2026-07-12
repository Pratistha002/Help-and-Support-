import { NextRequest } from "next/server";
import { createTechnicalMember, listTechnicalTeam } from "@/lib/server/store";
import { json, errorResponse, requireAdmin } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const all = req.nextUrl.searchParams.get("all") === "true";
    return json(await listTechnicalTeam(!all));
  } catch (e: any) {
    const status = e?.message === "Login required" ? 401 : e?.message?.includes("Admin") ? 403 : 500;
    return errorResponse(e?.message || "Failed", status);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    if (!body.name?.trim() || !body.email?.trim()) {
      return errorResponse("Name and email are required", 400);
    }
    const member = await createTechnicalMember({
      name: body.name,
      email: body.email,
      phone: body.phone,
      designation: body.designation,
      department: body.department,
      specialty: body.specialty,
    });
    return json(member, 201);
  } catch (e: any) {
    const status = e?.message === "Login required" ? 401 : e?.message?.includes("Admin") ? 403 : 400;
    return errorResponse(e?.message || "Failed", status);
  }
}
