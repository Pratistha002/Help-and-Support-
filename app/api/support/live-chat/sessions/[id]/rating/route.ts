import { NextRequest } from "next/server";
import { getRatingForSession, submitAgentRating } from "@/lib/server/store";
import { errorResponse, json, requireUser } from "@/lib/server/http";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireUser(_req);
    return json({ rating: await getRatingForSession(params.id) });
  } catch (e: any) {
    const msg = e?.message || "Failed";
    return errorResponse(msg, /Login required/i.test(msg) ? 401 : 500);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    const body = await req.json().catch(() => ({}));
    const rating = await submitAgentRating({
      sessionId: params.id,
      rating: Number(body?.rating),
      comment: typeof body?.comment === "string" ? body.comment : undefined,
      tags: Array.isArray(body?.tags) ? body.tags : undefined,
      userId: user.sub,
      userName: user.fullName || user.email,
      userEmail: user.email,
    });
    return json({ rating, message: "Thanks for your feedback!" });
  } catch (e: any) {
    const msg = e?.message || "Failed to save rating";
    const status = /Login required/i.test(msg)
      ? 401
      : /already rated|between 1 and 5|only after|No agent/i.test(msg)
        ? 400
        : 500;
    return errorResponse(msg, status);
  }
}
