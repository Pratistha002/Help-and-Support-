import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { signToken } from "@/lib/server/jwt";
import { serverEnv } from "@/lib/server/env";
import { json, errorResponse } from "@/lib/server/http";
import type { GuestUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = String(body.username || body.email || "").trim();
    const password = String(body.password || "");

    const adminUser = serverEnv.adminUsername.toUpperCase();
    const adminPassword = serverEnv.adminPassword;

    if (username.toUpperCase() !== adminUser || password !== adminPassword) {
      return errorResponse("Invalid admin credentials", 401);
    }

    const user: GuestUser = {
      id: randomUUID(),
      email: serverEnv.adminEmail,
      fullName: "ADMIN",
      currentRole: "ADMIN",
      accountType: "ADMIN",
    };

    const token = await signToken(user);
    return json({ token, user });
  } catch (e: any) {
    return errorResponse(e?.message || "Admin login failed", 500);
  }
}
