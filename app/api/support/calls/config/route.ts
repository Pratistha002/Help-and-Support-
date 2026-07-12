import { getPublicSupportConfig, isTwilioVoiceConfigured, serverEnv } from "@/lib/server/env";
import { isTwilioSoftphoneConfigured, outboundTwimlUrl } from "@/lib/server/twilioVoice";
import { json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const pub = getPublicSupportConfig();
  const base = serverEnv.supportWebhookBaseUrl?.replace(/\/$/, "") || "";
  return json({
    ...pub,
    twilioNumber: serverEnv.twilioPhone || null,
    voiceWebhookUrl: base ? `${base}/api/support/calls/inbound/` : null,
    smsWebhookUrl: base ? `${base}/api/support/sms/inbound/` : null,
    callStatusWebhookUrl: base ? `${base}/api/support/calls/status/` : null,
    smsStatusWebhookUrl: base ? `${base}/api/support/sms/status/` : null,
    outboundTwimlUrl: outboundTwimlUrl(),
    softphoneConfigured: isTwilioSoftphoneConfigured(),
    voiceSdkConfigured: isTwilioVoiceConfigured(),
    phoneCallbackEnabled: true,
    instructions: "Request a callback. An agent will call you from Call Management when online.",
  });
}
