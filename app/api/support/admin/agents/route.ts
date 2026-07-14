import { NextRequest } from "next/server";
import { getOverallAgentRatingStats, listSupportAgentsWithRatings } from "@/lib/server/store";
import { errorResponse, json, requireAdmin } from "@/lib/server/http";
import { serverEnv } from "@/lib/server/env";
import { corsHeaders } from "@/lib/server/cors";

function withCors(req: NextRequest, res: Response) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([key, value]) => {
    if (typeof value === "string") res.headers.set(key, value);
  });
  return res;
}

function allowCrossAppKey(req: NextRequest) {
  const key = (
    req.headers.get("x-help-desk-key") ||
    req.headers.get("x-admin-key") ||
    ""
  ).trim();
  if (!key) return false;
  return key === serverEnv.helpAgentPassword;
}

export async function OPTIONS(req: NextRequest) {
  return withCors(req, new Response(null, { status: 204 }));
}

export async function GET(req: NextRequest) {
  try {
    if (!allowCrossAppKey(req)) {
      await requireAdmin(req);
    }
    const [agents, overall] = await Promise.all([
      listSupportAgentsWithRatings(),
      getOverallAgentRatingStats(),
    ]);
    return withCors(req, json({ agents, overall }));
  } catch (e: any) {
    const msg = e?.message || "Failed";
    return withCors(req, errorResponse(msg, /required/i.test(msg) ? 403 : 500));
  }
}
