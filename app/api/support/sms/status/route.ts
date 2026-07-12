import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/** Twilio SMS delivery status webhook — acknowledge receipt. */
export async function POST(_req: NextRequest) {
  return new Response("OK", { status: 200 });
}
