import { NextRequest } from "next/server";
import { aiChat } from "@/lib/server/ai";
import { json, errorResponse } from "@/lib/server/http";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return json(await aiChat(body));
  } catch (e: any) {
    return errorResponse(e?.message || "AI chat failed", 500);
  }
}
