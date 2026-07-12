import { NextRequest } from "next/server";
import { serverEnv } from "@/lib/server/env";
import { normalizeToE164 } from "@/lib/server/twilio";

export const dynamic = "force-dynamic";

function readParam(req: NextRequest, form: FormData, key: string): string {
  const fromForm = String(form.get(key) || "").trim();
  if (fromForm) return fromForm;
  return String(req.nextUrl.searchParams.get(key) || "").trim();
}

/** TwiML: browser softphone dials the customer; admin hears audio when they answer (answerOnBridge). */
async function buildOutboundTwiml(req: NextRequest) {
  const form = await req.formData().catch(() => new FormData());
  const customerPhone = readParam(req, form, "customerPhone") || readParam(req, form, "To");
  const callbackId = readParam(req, form, "callbackId");
  const company = serverEnv.companyName;
  const callerId = serverEnv.twilioPhone || serverEnv.supportPhoneE164;
  const to = normalizeToE164(customerPhone);

  if (!to) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Sorry, the customer phone number is invalid.</Say>
  <Hangup/>
</Response>`;
  }

  const base = serverEnv.supportWebhookBaseUrl?.replace(/\/$/, "");
  const statusUrl =
    base && callbackId
      ? `${base}/api/support/calls/status/?callbackId=${encodeURIComponent(callbackId)}`
      : "";

  const statusAttrs = statusUrl
    ? ` statusCallback="${statusUrl}" statusCallbackEvent="initiated ringing answered completed busy no-answer failed canceled" statusCallbackMethod="POST"`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Calling ${company} customer. You will hear them when they answer.</Say>
  <Dial callerId="${callerId}" answerOnBridge="true">
    <Number${statusAttrs}>${to}</Number>
  </Dial>
</Response>`;
}

export async function GET(req: NextRequest) {
  const xml = await buildOutboundTwiml(req);
  return new Response(xml, { headers: { "Content-Type": "text/xml; charset=utf-8" } });
}

export async function POST(req: NextRequest) {
  const xml = await buildOutboundTwiml(req);
  return new Response(xml, { headers: { "Content-Type": "text/xml; charset=utf-8" } });
}
