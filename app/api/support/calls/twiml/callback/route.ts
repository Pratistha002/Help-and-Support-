import { NextRequest } from "next/server";
import { serverEnv } from "@/lib/server/env";

export const dynamic = "force-dynamic";

/** TwiML: when customer answers outbound callback, connect them to the admin agent phone. */
export async function GET(req: NextRequest) {
  const adminPhone = req.nextUrl.searchParams.get("adminPhone") || "";
  const company = serverEnv.companyName;
  const callerId = serverEnv.twilioPhone || serverEnv.supportPhoneE164;

  const xml = adminPhone
    ? `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hello, this is ${company} support. Please hold while we connect you to an agent.</Say>
  <Dial callerId="${callerId}">${adminPhone}</Dial>
</Response>`
    : `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hello, this is ${company} support. No agent is available right now. Please try again later.</Say>
  <Hangup/>
</Response>`;

  return new Response(xml, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}
