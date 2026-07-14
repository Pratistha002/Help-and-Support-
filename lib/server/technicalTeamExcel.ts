import * as XLSX from "xlsx";

export const TECHNICAL_TEAM_HEADERS = ["Name", "Designation", "Mobile Number", "Email"] as const;

export type TechnicalTeamImportRow = {
  name: string;
  designation?: string;
  phone?: string;
  email: string;
  department?: string;
};

function cell(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const found = Object.keys(row).find((k) => k.trim().toLowerCase() === key.toLowerCase());
    if (found != null && row[found] != null && String(row[found]).trim()) {
      return String(row[found]).trim();
    }
  }
  return "";
}

export function buildTechnicalTeamTemplateBuffer(): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    [...TECHNICAL_TEAM_HEADERS],
    ["Hariom Singh", "Product Engineer", "+919559766238", "hariom.singh@nattlabs.com"],
  ]);
  ws["!cols"] = [{ wch: 22 }, { wch: 20 }, { wch: 18 }, { wch: 32 }];
  XLSX.utils.book_append_sheet(wb, ws, "Technical Team");
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

export function parseTechnicalTeamExcel(buffer: Buffer): {
  rows: TechnicalTeamImportRow[];
  errors: string[];
} {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { rows: [], errors: ["Excel file has no sheets"] };

  const sheet = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const rows: TechnicalTeamImportRow[] = [];
  const errors: string[] = [];

  raw.forEach((row, idx) => {
    const line = idx + 2;
    const name = cell(row, "Name", "Full Name", "Member Name");
    const email = cell(row, "Email", "Email Address", "E-mail").toLowerCase();
    const phone = cell(row, "Mobile Number", "Mobile", "Phone", "Phone Number");
    const designation = cell(row, "Designation", "Role", "Title");
    const department = cell(row, "Department") || "Product Engineering";

    if (!name && !email) return;
    if (!name || !email) {
      errors.push(`Row ${line}: Name and Email are required`);
      return;
    }
    if (!/^[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(email)) {
      errors.push(`Row ${line}: Invalid email "${email}"`);
      return;
    }
    rows.push({ name, email, phone: phone || undefined, designation: designation || undefined, department });
  });

  return { rows, errors };
}
