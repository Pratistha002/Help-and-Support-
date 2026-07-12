import { NextRequest } from "next/server";
import { requestLiveChat } from "@/lib/server/store";
import { json, errorResponse, requireUser } from "@/lib/server/http";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const session = await requestLiveChat(
      {
        id: user.sub,
        fullName: user.fullName,
        email: user.email,
        currentRole: user.currentRole,
        accountType: user.accountType,
      },
      body,
    );
    return json(session);
  } catch (e: any) {
    return errorResponse(e?.message || "Live chat request failed", e?.message === "Login required" ? 401 : 500);
  }
}
