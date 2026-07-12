import { isTwilioSmsConfigured, serverEnv } from "./env";

/** Normalize phone to E.164 (defaults 10-digit IN numbers to +91). */
export function normalizeToE164(phone: string | undefined | null): string | null {
  if (!phone || !phone.trim()) return null;
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  if (trimmed.startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (digits.length >= 10) return `+${digits}`;
  return `+${digits}`;
}

export async function sendSms(toPhone: string, body: string): Promise<{ ok: boolean; sid?: string; error?: string }> {
  if (!isTwilioSmsConfigured()) {
    return { ok: false, error: "Twilio SMS is not configured" };
  }

  const to = normalizeToE164(toPhone);
  if (!to) return { ok: false, error: "Invalid phone number" };

  const auth = Buffer.from(`${serverEnv.twilioAccountSid}:${serverEnv.twilioAuthToken}`).toString("base64");
  const params = new URLSearchParams({
    To: to,
    From: serverEnv.twilioPhone,
    Body: body.slice(0, 1600),
  });

  if (serverEnv.supportWebhookBaseUrl) {
    const base = serverEnv.supportWebhookBaseUrl.replace(/\/$/, "");
    params.set("StatusCallback", `${base}/api/support/sms/status/`);
  }

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${serverEnv.twilioAccountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data?.message || `Twilio error (${res.status})` };
    }
    return { ok: true, sid: data.sid };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Twilio request failed" };
  }
}

export function smsAckMessage(ticketNumber: string, company = serverEnv.companyName) {
  return `${company} Support: We received your request. Ticket ${ticketNumber}. Our team will respond soon.`;
}

export function callAckMessage(ticketNumber?: string, company = serverEnv.companyName) {
  if (ticketNumber) {
    return `${company} Support: Callback request ${ticketNumber} received. We will call you shortly.`;
  }
  return `${company} Support: We received your callback request. Our team will call you shortly.`;
}

export async function initiateCallbackCall(opts: {
  customerPhone: string;
  callbackId: string;
  adminPhone: string;
}): Promise<{ ok: boolean; sid?: string; error?: string }> {
  if (!isTwilioSmsConfigured()) {
    return { ok: false, error: "Twilio is not configured (check TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)" };
  }

  const customer = normalizeToE164(opts.customerPhone);
  const admin = normalizeToE164(opts.adminPhone);
  if (!customer) return { ok: false, error: "Invalid customer phone number" };
  if (!admin) return { ok: false, error: "Invalid admin phone number — use full E.164 format (e.g. +919876543210)" };

  const company = serverEnv.companyName;
  const callerId = serverEnv.twilioPhone || serverEnv.supportPhoneE164;
  // Inline TwiML — works without a public webhook URL (customer is connected to admin when they answer)
  const twiml =
    `<Response>` +
    `<Say voice="alice">Hello, this is ${company} support. Please hold while we connect you to an agent.</Say>` +
    `<Dial callerId="${callerId}">${admin}</Dial>` +
    `</Response>`;

  const auth = Buffer.from(`${serverEnv.twilioAccountSid}:${serverEnv.twilioAuthToken}`).toString("base64");
  const params = new URLSearchParams({
    To: customer,
    From: serverEnv.twilioPhone,
    Twiml: twiml,
  });

  const base = serverEnv.supportWebhookBaseUrl?.replace(/\/$/, "");
  if (base) {
    params.set("StatusCallback", `${base}/api/support/calls/status/?callbackId=${encodeURIComponent(opts.callbackId)}`);
    params.set("StatusCallbackEvent", "initiated ringing answered completed busy no-answer failed canceled");
    params.set("StatusCallbackMethod", "POST");
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${serverEnv.twilioAccountSid}/Calls.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
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
