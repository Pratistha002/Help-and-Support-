import { NextRequest } from "next/server";
import { closeLiveSession } from "@/lib/server/store";
import { json, errorResponse } from "@/lib/server/http";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    return json(await closeLiveSession(params.id));
  } catch (e: any) {
    return errorResponse(e?.message || "Failed", 500);
  }
}
