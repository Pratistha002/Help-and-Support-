import { NextRequest } from "next/server";
import { importTechnicalTeamMembers } from "@/lib/server/store";
import { parseTechnicalTeamExcel } from "@/lib/server/technicalTeamExcel";
import { json, errorResponse, requireAdmin } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return errorResponse("Upload an Excel file (.xlsx / .xls)", 400);
    }

    const name = (file as File).name || "";
    if (!/\.xlsx?$/i.test(name)) {
      return errorResponse("Upload .xlsx or .xls only", 400);
    }

    const buffer = Buffer.from(await (file as File).arrayBuffer());
    const parsed = parseTechnicalTeamExcel(buffer);
    if (!parsed.rows.length) {
      return errorResponse(
        parsed.errors[0] || "No valid rows found. Use columns: Name, Designation, Mobile Number, Email",
        400,
      );
    }

    const result = await importTechnicalTeamMembers(parsed.rows);
    const allErrors = [...parsed.errors, ...result.errors];
    return json({
      ok: true,
      created: result.created.length,
      updated: result.updated.length,
      errors: allErrors,
      message: `Import complete — ${result.created.length} added, ${result.updated.length} updated` +
        (allErrors.length ? ` (${allErrors.length} row warnings)` : ""),
    });
  } catch (e: any) {
    const status = e?.message === "Login required" ? 401 : e?.message?.includes("Admin") ? 403 : 400;
    return errorResponse(e?.message || "Import failed", status);
  }
}
