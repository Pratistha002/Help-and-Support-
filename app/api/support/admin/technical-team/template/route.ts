import { NextRequest } from "next/server";
import { buildTechnicalTeamTemplateBuffer } from "@/lib/server/technicalTeamExcel";
import { errorResponse, requireAdmin } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const buffer = buildTechnicalTeamTemplateBuffer();
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="technical_team_template.xlsx"',
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    const status = e?.message === "Login required" ? 401 : e?.message?.includes("Admin") ? 403 : 500;
    return errorResponse(e?.message || "Failed to build template", status);
  }
}
