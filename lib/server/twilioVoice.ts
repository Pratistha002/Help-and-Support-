import twilio from "twilio";
import { isTwilioVoiceConfigured, isTwilioSmsConfigured, serverEnv } from "./env";
import { normalizeToE164 } from "./twilio";

const TWIML_APP_NAME = "SaarthiWorkforce Help Support Outbound";
let cachedTwimlAppSid: string | null = null;

function twilioBasicAuth(): string {
  return Buffer.from(`${serverEnv.twilioAccountSid}:${serverEnv.twilioAuthToken}`).toString("base64");
}

/** Browser softphone — needs Voice SDK keys + Twilio phone. No public webhook required. */
export function isTwilioSoftphoneConfigured(): boolean {
  return isTwilioVoiceConfigured() && isTwilioSmsConfigured();
}

export function outboundTwimlUrl(): string | null {
  const base = serverEnv.supportWebhookBaseUrl?.replace(/\/$/, "");
  return base ? `${base}/api/support/calls/twiml/outbound/` : null;
}

/** Resolve TwiML App SID from env or auto-create one pointing at our outbound webhook. */
export async function getTwimlAppSid(): Promise<string | null> {
  if (serverEnv.twilioTwimlAppSid) return serverEnv.twilioTwimlAppSid;
  if (cachedTwimlAppSid) return cachedTwimlAppSid;

  const voiceUrl = outboundTwimlUrl();
  if (!voiceUrl || !isTwilioSmsConfigured()) return null;

  try {
    const listRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${serverEnv.twilioAccountSid}/Applications.json`,
      { headers: { Authorization: `Basic ${twilioBasicAuth()}` } },
    );
    const list = await listRes.json().catch(() => ({}));
    const existing = (list.applications || []).find(
      (app: { friendly_name?: string; sid?: string }) => app.friendly_name === TWIML_APP_NAME,
    );
    if (existing?.sid) {
      cachedTwimlAppSid = existing.sid;
      return existing.sid;
    }

    const params = new URLSearchParams({
      FriendlyName: TWIML_APP_NAME,
      VoiceUrl: voiceUrl,
      VoiceMethod: "POST",
    });
    const createRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${serverEnv.twilioAccountSid}/Applications.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${twilioBasicAuth()}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      },
    );
    const created = await createRes.json().catch(() => ({}));
    if (created.sid) {
      cachedTwimlAppSid = created.sid;
      return created.sid;
    }
  } catch {
    return null;
  }
  return null;
}

export async function createAdminVoiceToken(
  identity: string,
): Promise<{ token: string; identity: string } | { error: string }> {
  if (!isTwilioSoftphoneConfigured()) {
    return {
      error: "Softphone needs TWILIO_API_KEY, TWILIO_API_SECRET, and TWILIO_PHONE_NUMBER in .env",
    };
  }

  const AccessToken = twilio.jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;

  const token = new AccessToken(
    serverEnv.twilioAccountSid,
    serverEnv.twilioApiKey,
    serverEnv.twilioApiSecret,
    { identity, ttl: 3600 },
  );

  token.addGrant(
    new VoiceGrant({
      incomingAllow: true,
    }),
  );

  return { token: token.toJwt(), identity };
}

/**
 * Call the customer via REST API; when they answer, bridge to admin browser (Client).
 * Uses inline TwiML — works on localhost without a public webhook URL.
 */
export async function initiateSoftphoneCallback(opts: {
  customerPhone: string;
  callbackId: string;
  adminIdentity: string;
}): Promise<{ ok: boolean; sid?: string; error?: string }> {
  if (!isTwilioSmsConfigured()) {
    return { ok: false, error: "Twilio is not configured" };
  }

  const customer = normalizeToE164(opts.customerPhone);
  if (!customer) return { ok: false, error: "Invalid customer phone number" };

  const clientId = opts.adminIdentity.replace(/[^a-zA-Z0-9_-]/g, "_");
  if (!clientId) return { ok: false, error: "Invalid admin softphone identity" };

  const company = serverEnv.companyName;
  const callerId = serverEnv.twilioPhone || serverEnv.supportPhoneE164;
  const twiml =
    `<Response>` +
    `<Say voice="alice">Hello, this is ${company} support. Please hold while we connect you to an agent.</Say>` +
    `<Dial callerId="${callerId}" answerOnBridge="true">` +
    `<Client>${clientId}</Client>` +
    `</Dial>` +
    `</Response>`;

  const params = new URLSearchParams({
    To: customer,
    From: serverEnv.twilioPhone,
    Twiml: twiml,
  });

  const base = serverEnv.supportWebhookBaseUrl?.replace(/\/$/, "");
  if (base && opts.callbackId) {
    params.set(
      "StatusCallback",
      `${base}/api/support/calls/status/?callbackId=${encodeURIComponent(opts.callbackId)}`,
    );
    params.set("StatusCallbackEvent", "initiated ringing answered completed busy no-answer failed canceled");
    params.set("StatusCallbackMethod", "POST");
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${serverEnv.twilioAccountSid}/Calls.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${twilioBasicAuth()}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data?.message || `Twilio call error (${res.status})` };
    }
    return { ok: true, sid: data.sid };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Twilio call request failed" };
  }
}
