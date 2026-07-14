import { NextRequest } from "next/server";
import type { GuestUser } from "@/lib/auth";
import { json, errorResponse } from "@/lib/server/http";
import { signToken } from "@/lib/server/jwt";
import { verifyWorkforceToken } from "@/lib/server/workforceJwt";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = String(body.token || "").trim();
    if (!token) return errorResponse("Workforce token is required", 400);

    const claims = await verifyWorkforceToken(token);
    if (!claims) {
      return errorResponse(
        "Invalid or expired workforce session. Ensure JWT_SECRET / ORG_AUTH_JWT_SECRET matches SaarthiWorkforce.",
        401,
      );
    }

    const fullName =
      String(body.fullName || body.name || claims.fullName || "").trim() ||
      claims.email.split("@")[0] ||
      "User";

    const roleCandidate = String(body.currentRole || claims.currentRole || "EMPLOYEE");
    const currentRole = (
      ["EMPLOYEE", "MANAGER", "HR", "ADMIN"].includes(roleCandidate) ? roleCandidate : "EMPLOYEE"
    ) as GuestUser["currentRole"];

    const bodyAccount = String(body.accountType || "").toUpperCase();
    const accountType = (
      claims.accountType === "ADMIN" || bodyAccount === "ADMIN" ? "ADMIN" : "EMPLOYEE"
    ) as GuestUser["accountType"];

    const user: GuestUser = {
      id: claims.sub,
      email: claims.email,
      fullName,
      accountType,
      currentRole: accountType === "ADMIN" ? "ADMIN" : currentRole,
    };

    const hsToken = await signToken(user);
    return json({ token: hsToken, user, workforceToken: token });
  } catch (e: any) {
    return errorResponse(e?.message || "Workforce sync failed", 500);
  }
}
