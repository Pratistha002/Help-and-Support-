import nodemailer from "nodemailer";
import {
  isBrevoApiConfigured,
  isGmailSmtpConfigured,
  isMailConfigured,
  isSmtpConfigured,
  serverEnv,
} from "./env";

let transporter: nodemailer.Transporter | null = null;
let transporterSig = "";

function transportSignature() {
  return `${serverEnv.mailProvider}|${serverEnv.mailHost}|${serverEnv.mailPort}|${serverEnv.mailUser}`;
}

function getTransporter() {
  if (!isSmtpConfigured() && !isBrevoApiConfigured()) return null;
  if (!serverEnv.mailUser || !serverEnv.mailPass) return null;

  const sig = transportSignature();
  if (transporter && transporterSig === sig) return transporter;

  const isBrevo =
    serverEnv.mailProvider === "brevo" || serverEnv.mailHost.includes("brevo");

  transporter = nodemailer.createTransport({
    host: serverEnv.mailHost,
    port: serverEnv.mailPort,
    secure: serverEnv.mailPort === 465,
    auth: {
      user: serverEnv.mailUser,
      pass: serverEnv.mailPass,
    },
    ...(isBrevo || serverEnv.mailPort === 587
      ? { requireTLS: true, tls: { minVersion: "TLSv1.2" as const } }
      : {}),
  });
  transporterSig = sig;
  return transporter;
}

function isBrevoIpBlockedError(msg: string): boolean {
  return /unrecognised ip|unrecognized ip|ip not authorized|authorised_ips|authorized_ips/i.test(
    msg,
  );
}

function formatBrevoApiError(msg: string): string {
  if (isBrevoIpBlockedError(msg)) {
    const ipMatch = msg.match(/\b(\d{1,3}(?:\.\d{1,3}){3})\b/);
    const ip = ipMatch?.[1] || "your server IP";
    return (
      `Brevo blocked this server IP (${ip}). ` +
      `Add it under Brevo → Security → Authorised IPs: https://app.brevo.com/security/authorised_ips ` +
      `(or deactivate IP blocking for API keys while developing).`
    );
  }
  return msg;
}

export type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
};

function mailNotConfiguredMessage(): string {
  if (serverEnv.mailProvider === "brevo-pending") {
    return "Brevo selected — set BREVO_API_KEY or BREVO_SMTP_KEY in .env";
  }
  return "Email is not configured (set BREVO_API_KEY or BREVO_SMTP_KEY + BREVO_SMTP_LOGIN in .env)";
}

async function sendViaBrevoApi(input: SendMailInput): Promise<string | null> {
  const apiKey = serverEnv.brevoApiKey;
  if (!apiKey) return "Brevo API key not configured";

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: `${serverEnv.companyName} Support`,
          email: serverEnv.mailFrom,
        },
        to: [{ email: input.to.trim() }],
        subject: input.subject,
        textContent: input.text,
        ...(input.replyTo?.trim() ? { replyTo: { email: input.replyTo.trim() } } : {}),
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.message || data?.code || `Brevo API error (${res.status})`;
      if (/sender|from|not verified|invalid/i.test(String(msg))) {
        return `${msg} — verify ${serverEnv.mailFrom} as a sender in Brevo (Senders & IP)`;
      }
      return String(msg);
    }
    return null;
  } catch (e: any) {
    return e?.message || "Brevo API request failed";
  }
}

async function sendViaSmtp(input: SendMailInput): Promise<string | null> {
  const transport = getTransporter();
  if (!transport) return mailNotConfiguredMessage();

  try {
    await transport.sendMail({
      from: `"${serverEnv.companyName} Support" <${serverEnv.mailFrom}>`,
      to: input.to.trim(),
      subject: input.subject,
      text: input.text,
      replyTo: input.replyTo?.trim() || undefined,
    });
    return null;
  } catch (e: any) {
    const msg = e?.message || "SMTP send failed";
    if (serverEnv.mailProvider === "brevo" && /auth|535|invalid|login/i.test(msg)) {
      return `${msg} — regenerate SMTP key in Brevo (SMTP & API), confirm login email matches Brevo SMTP login, and authorize this IP for SMTP`;
    }
    return msg;
  }
}

/** Last resort: send via Gmail SMTP using app password (same mailbox as APP_MAIL_FROM). */
async function sendViaGmailSmtp(input: SendMailInput): Promise<string | null> {
  if (!isGmailSmtpConfigured()) {
    return "Gmail SMTP fallback is not configured (set SUPPORT_IMAP_PASSWORD or GMAIL_APP_PASSWORD)";
  }

  try {
    const transport = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: serverEnv.gmailSmtpUser,
        pass: serverEnv.gmailSmtpPass,
      },
      tls: { minVersion: "TLSv1.2" as const },
    });

    await transport.sendMail({
      from: `"${serverEnv.companyName} Support" <${serverEnv.mailFrom}>`,
      to: input.to.trim(),
      subject: input.subject,
      text: input.text,
      replyTo: input.replyTo?.trim() || undefined,
    });
    return null;
  } catch (e: any) {
    return e?.message || "Gmail SMTP send failed";
  }
}

/** @returns null on success, error message on failure */
export async function sendPlainTextMail(input: SendMailInput): Promise<string | null> {
  if (!isMailConfigured()) return mailNotConfiguredMessage();

  const errors: string[] = [];

  if (isBrevoApiConfigured()) {
    const apiErr = await sendViaBrevoApi(input);
    if (!apiErr) return null;
    errors.push(formatBrevoApiError(apiErr));
  }

  if (isSmtpConfigured()) {
    const smtpErr = await sendViaSmtp(input);
    if (!smtpErr) return null;
    errors.push(smtpErr);
  }

  // When Brevo blocks the server IP (common on home/office networks), fall back to Gmail.
  if (isGmailSmtpConfigured()) {
    const gmailErr = await sendViaGmailSmtp(input);
    if (!gmailErr) return null;
    errors.push(`Gmail fallback: ${gmailErr}`);
  }

  if (!errors.length) return mailNotConfiguredMessage();
  return errors.join(" | ");
}

export async function sendTicketAckToCustomer(opts: {
  to: string;
  name: string;
  ticketNumber: string;
  subject: string;
}) {
  const inbox = serverEnv.supportEmailTo;
  const body = `Dear ${opts.name || "Customer"},

Thank you for contacting ${serverEnv.companyName} Support.

Your support ticket has been created successfully.

Ticket number: ${opts.ticketNumber}
Subject: ${opts.subject}

Our team will review your request and respond within 24 hours from ${inbox}.

To add more details, reply to this email and include your ticket number (${opts.ticketNumber}).

— ${serverEnv.companyName} Support Team
${inbox}`;

  return sendPlainTextMail({
    to: opts.to,
    subject: `[${serverEnv.companyName} Support] Ticket ${opts.ticketNumber} — We received your request`,
    text: body,
    replyTo: inbox,
  });
}

export async function sendCallbackAckToCustomer(opts: {
  to: string;
  name: string;
  callbackReference: string;
  queuePosition?: number;
}) {
  const inbox = serverEnv.supportEmailTo;
  const queueLine =
    opts.queuePosition != null ? `Queue position: ${opts.queuePosition}\n` : "";
  const body = `Dear ${opts.name || "Customer"},

Thank you for requesting a callback from ${serverEnv.companyName} Support.

Your callback request has been received (reference ${opts.callbackReference}).
${queueLine}Our team will call you back shortly. No support ticket has been created yet — if follow-up is needed after your call, our agent will raise one for you.

— ${serverEnv.companyName} Support Team
${inbox}`;

  return sendPlainTextMail({
    to: opts.to,
    subject: `[${serverEnv.companyName} Support] Callback request ${opts.callbackReference} received`,
    text: body,
    replyTo: inbox,
  });
}

export async function notifySupportInbox(opts: {
  ticketNumber: string;
  channel: string;
  name?: string;
  email?: string;
  phone?: string;
  subject: string;
  message: string;
  isTicket?: boolean;
}) {
  const to = serverEnv.supportEmailTo;
  if (!to) return null;

  const lines = [
    opts.isTicket === false
      ? `New ${opts.channel} callback request — ${opts.ticketNumber}`
      : `New ${opts.channel} support request — ${opts.ticketNumber}`,
    "",
    opts.name ? `Name: ${opts.name}` : null,
    opts.email ? `Email: ${opts.email}` : null,
    opts.phone ? `Phone: ${opts.phone}` : null,
    `Subject: ${opts.subject}`,
    "",
    opts.message,
  ].filter(Boolean);

  return sendPlainTextMail({
    to,
    subject: `[Support] ${opts.ticketNumber} — ${opts.subject}`,
    text: lines.join("\n"),
    replyTo: opts.email,
  });
}
