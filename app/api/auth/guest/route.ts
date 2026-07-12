import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { signToken } from "@/lib/server/jwt";
import { json, errorResponse } from "@/lib/server/http";
import type { GuestUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const fullName = String(body.name || body.fullName || "").trim();
    const currentRole = (body.currentRole || "EMPLOYEE") as GuestUser["currentRole"];

    if (!email || !fullName) {
      return errorResponse("Name and email are required");
    }

    const user: GuestUser = {
      id: randomUUID(),
      email,
      fullName,
      currentRole: ["EMPLOYEE", "MANAGER", "HR", "ADMIN"].includes(currentRole) ? currentRole : "EMPLOYEE",
      accountType: "EMPLOYEE",
    };

    const token = await signToken(user);
    return json({ token, user });
  } catch (e: any) {
    return errorResponse(e?.message || "Guest signup failed", 500);
  }
}
