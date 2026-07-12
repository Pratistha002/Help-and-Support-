import nodeProcess from "node:process";
import { readFileSync } from "node:fs";

/** Linux/Docker: read real OS env when Next.js webpack shim hides variables. */
function osEnviron(): Record<string, string> {
  try {
    const raw = readFileSync("/proc/self/environ");
    const out: Record<string, string> = {};
    for (const entry of raw.toString("utf8").split("\0")) {
      const eq = entry.indexOf("=");
      if (eq > 0) out[entry.slice(0, eq)] = entry.slice(eq + 1);
    }
    return out;
  } catch {
    return {};
  }
}

function envValue(key: string): string | undefined {
  const fromNode = nodeProcess.env[key];
  if (fromNode != null && String(fromNode).trim() !== "") return String(fromNode).trim();
  const fromOs = osEnviron()[key];
  if (fromOs != null && String(fromOs).trim() !== "") return String(fromOs).trim();
  return undefined;
}

/** Read OS environment at runtime (compatible with Next.js standalone + Docker). */
function pick(...keys: string[]): string {
  for (const key of keys) {
    const v = envValue(key);
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

/** Resolve SMTP — Brevo when configured; falls back to Gmail/generic SMTP. */
function resolveMailSettings() {
  const mailPort = parseInt(pick("SPRING_MAIL_PORT", "SMTP_PORT") || "587", 10);
  const port = Number.isFinite(mailPort) ? mailPort : 587;

  const brevoKey = pick("BREVO_SMTP_KEY", "SPRING_MAIL_PASSWORD", "SMTP_PASS");
  const mailProviderPref = pick("MAIL_PROVIDER").toLowerCase();
  const springHost = pick("SPRING_MAIL_HOST", "SMTP_HOST");
  const springUser = pick("BREVO_SMTP_LOGIN", "BREVO_SMTP_USER", "SPRING_MAIL_USERNAME", "SMTP_USER");
  const springPass = pick("SPRING_MAIL_PASSWORD", "BREVO_SMTP_KEY", "SMTP_PASS");
  const mailFrom = pick("APP_MAIL_FROM", "BREVO_SMTP_USER", "SPRING_MAIL_USERNAME", "SMTP_USER");
  const supportEmailTo = pick("SUPPORT_EMAIL_TO", "APP_MAIL_FROM", "BREVO_SMTP_USER", "SPRING_MAIL_USERNAME", "SMTP_USER");

  const useBrevo =
    mailProviderPref === "brevo" ||
    Boolean(brevoKey) ||
    springHost.includes("brevo");

  const brevoPass = brevoKey || (useBrevo && springHost.includes("brevo") ? springPass : "");

  if (useBrevo && brevoPass && springUser) {
    return {
      mailHost: springHost.includes("brevo") ? springHost : "smtp-relay.brevo.com",
      mailPort: port,
      mailUser: springUser,
      mailPass: brevoPass,
      mailFrom,
      supportEmailTo,
      mailProvider: "brevo" as const,
    };
  }

  return {
    mailHost: springHost || "smtp.gmail.com",
    mailPort: port,
    mailUser: springUser,
    mailPass: springPass,
    mailFrom,
    supportEmailTo,
    mailProvider: useBrevo ? ("brevo-pending" as const) : ("smtp" as const),
  };
}

export function readEnv() {
  const mail = resolveMailSettings();

  return {
    mongodbUri: pick("MONGODB_URI") || "mongodb://localhost:27017/saarthi_workforce_support",
    /** Optional override when MONGODB_URI has no database segment. Workforce uses its own DB — not SaarthiX. */
    supportMongodbDatabase: pick("SUPPORT_MONGODB_DATABASE") || "",
    jwtSecret: pick("JWT_SECRET") || "help-support-change-me",
    adminUsername: pick("ADMIN_USERNAME") || "ADMIN",
    adminPassword: pick("ADMIN_PASSWORD") || "Admin@221105",
    adminEmail: pick("ADMIN_EMAIL") || "admin@saarthix.com",
    helpAgentPassword: pick("HELP_AGENT_PASSWORD") || "Help@221716",
    openaiApiKey: pick("OPENAI_API_KEY"),
    appFrontendUrl: pick("APP_FRONTEND_URL") || "http://localhost:3003",
    corsAllowedOrigins: pick("APP_CORS_ALLOWED_ORIGINS"),

    mailHost: mail.mailHost,
    mailPort: mail.mailPort,
    mailUser: mail.mailUser,
    mailPass: mail.mailPass,
    mailFrom: mail.mailFrom,
    supportEmailTo: mail.supportEmailTo,
    mailProvider: mail.mailProvider,
    brevoApiKey: pick("BREVO_API_KEY"),

    twilioAccountSid: pick("TWILIO_ACCOUNT_SID"),
    twilioAuthToken: pick("TWILIO_AUTH_TOKEN"),
    twilioPhone: pick("TWILIO_PHONE_NUMBER"),
    twilioApiKey: pick("TWILIO_API_KEY"),
    twilioApiSecret: pick("TWILIO_API_SECRET"),
    twilioTwimlAppSid: pick("TWILIO_TWIML_APP_SID"),
    supportWebhookBaseUrl: pick("HELP_SUPPORT_WEBHOOK_BASE_URL", "SUPPORT_WEBHOOK_BASE_URL", "APP_FRONTEND_URL"),
    supportPhoneDisplay: pick("SUPPORT_PHONE_DISPLAY") || "+1 878 732 2485",
    supportPhoneE164: pick("SUPPORT_PHONE_E164") || "+18787322485",

    companyName: pick("SUPPORT_COMPANY_NAME") || "SaarthiWorkforce",
  };
}

export const serverEnv = new Proxy({} as ReturnType<typeof readEnv>, {
  get(_target, prop: string) {
    return readEnv()[prop as keyof ReturnType<typeof readEnv>];
  },
});

export function isBrevoApiConfigured(): boolean {
  const e = readEnv();
  return Boolean(e.brevoApiKey && e.mailFrom);
}

export function isSmtpConfigured(): boolean {
  const e = readEnv();
  return Boolean(e.mailUser && e.mailPass && e.mailFrom);
}

export function isMailConfigured(): boolean {
  return isBrevoApiConfigured() || isSmtpConfigured();
}

export function isTwilioSmsConfigured(): boolean {
  const e = readEnv();
  return Boolean(e.twilioAccountSid && e.twilioAuthToken && e.twilioPhone);
}

export function isTwilioVoiceConfigured(): boolean {
  const e = readEnv();
  return isTwilioSmsConfigured() && Boolean(e.twilioApiKey && e.twilioApiSecret);
}

export function getPublicSupportConfig() {
  const e = readEnv();
  return {
    supportEmail: e.supportEmailTo || e.mailFrom,
    supportPhoneDisplay: e.supportPhoneDisplay,
    supportPhoneE164: e.supportPhoneE164,
    telUri: `tel:${e.supportPhoneE164.replace(/\s/g, "")}`,
    mailConfigured: isMailConfigured(),
    smsConfigured: isTwilioSmsConfigured(),
    callConfigured: isTwilioSmsConfigured(),
    voiceSdkConfigured: isTwilioVoiceConfigured(),
    webhookBaseUrl: e.supportWebhookBaseUrl || null,
    companyName: e.companyName,
    mailProvider: isBrevoApiConfigured() ? "brevo-api" : e.mailProvider,
    brevoActive: isBrevoApiConfigured() || e.mailProvider === "brevo",
    brevoApiConfigured: isBrevoApiConfigured(),
    smtpConfigured: isSmtpConfigured(),
  };
}
