import { NextRequest } from "next/server";
import { signToken } from "@/lib/server/jwt";
import { serverEnv } from "@/lib/server/env";
import { upsertSupportAgent } from "@/lib/server/store";
import { json, errorResponse } from "@/lib/server/http";
import { corsHeaders } from "@/lib/server/cors";
import type { GuestUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function withCors(req: NextRequest, res: Response) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([key, value]) => {
    if (typeof value === "string") res.headers.set(key, value);
  });
  return res;
}

export async function OPTIONS(req: NextRequest) {
  return withCors(req, new Response(null, { status: 204 }));
}

/** Help desk agent login — username, email, shared password. Registers agent email for notifications. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name || body.username || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!name) return withCors(req, errorResponse("Name is required"));
    if (!email || !email.includes("@")) return withCors(req, errorResponse("Valid email is required"));
    if (password !== serverEnv.helpAgentPassword) {
      return withCors(req, errorResponse("Invalid help desk password", 401));
    }

    const agent = await upsertSupportAgent({ email, name, username: name });

    const user: GuestUser = {
      id: agent.id,
      email: agent.email,
      fullName: agent.name,
      currentRole: "ADMIN",
      accountType: "ADMIN",
    };

    const token = await signToken(user);
    return withCors(req, json({ token, user, agent }));
  } catch (e: any) {
    return withCors(req, errorResponse(e?.message || "Help agent login failed", 500));
  }
}
