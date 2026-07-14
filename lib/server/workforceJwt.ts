import { jwtVerify } from "jose";
import { readEnv } from "./env";

export type WorkforcePayload = {
  sub: string;
  email: string;
  fullName?: string;
  phone?: string;
  accountType: "EMPLOYEE" | "ADMIN";
  currentRole: "EMPLOYEE" | "MANAGER" | "HR" | "ADMIN";
};

function secretKeys(): Uint8Array[] {
  const env = readEnv();
  const raw = [
    process.env.ORG_AUTH_JWT_SECRET,
    process.env.JWT_SECRET,
    env.jwtSecret,
    "dev-only-change-me",
  ].filter((s) => Boolean(s) && String(s).trim() !== "") as string[];
  const unique = [...new Set(raw.map((s) => String(s).trim()))];
  return unique.map((s) => new TextEncoder().encode(s));
}

function payloadFromClaims(payload: Record<string, unknown>): WorkforcePayload | null {
  const sub = String(payload.sub || payload.id || "");
  const email = String(payload.email || "");
  if (!sub || !email) return null;
  const accountType = (payload.accountType as WorkforcePayload["accountType"]) || "EMPLOYEE";
  let currentRole = (payload.currentRole as WorkforcePayload["currentRole"]) || "EMPLOYEE";
  if (accountType === "ADMIN") currentRole = "ADMIN";
  const phone = String(payload.mobileNo || payload.phone || payload.phoneNumber || "").trim();
  return {
    sub,
    email,
    fullName: String(payload.fullName || payload.name || ""),
    phone: phone || undefined,
    accountType,
    currentRole,
  };
}

export function workforceApiBases(): string[] {
  const candidates = [
    process.env.WORKFORCE_API_INTERNAL_URL,
    process.env.WORKFORCE_API_URL,
    process.env.NEXT_PUBLIC_WORKFORCE_APP_URL,
    "http://host.docker.internal:3002",
    "http://host.docker.internal:8081",
    "http://127.0.0.1:3002",
    "http://127.0.0.1:8081",
    "http://localhost:3002",
    "http://localhost:8081",
  ]
    .map((s) => String(s || "").trim().replace(/\/$/, ""))
    .filter(Boolean);
  return [...new Set(candidates)];
}

async function verifyViaWorkforceApi(token: string): Promise<WorkforcePayload | null> {
  for (const base of workforceApiBases()) {
    const urls = [
      `${base}/api/org-auth/me/profile/`,
      `${base}/api/org-auth/me/profile`,
      `${base}/api/org-auth/me/`,
      `${base}/api/org-auth/me`,
    ];
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) continue;
        const data = (await res.json()) as Record<string, unknown>;
        const claims = payloadFromClaims(data);
        if (claims) return claims;
      } catch {
        /* try next */
      }
    }
  }
  return null;
}

/** Fetch Workforce profile phone (`mobileNo`) after token is already verified. */
export async function fetchWorkforceProfilePhone(token: string): Promise<string> {
  for (const base of workforceApiBases()) {
    for (const path of ["/api/org-auth/me/profile/", "/api/org-auth/me/profile"]) {
      try {
        const res = await fetch(`${base}${path}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) continue;
        const data = (await res.json()) as Record<string, unknown>;
        const phone = String(data.mobileNo || data.phone || data.phoneNumber || "").trim();
        if (phone) return phone;
      } catch {
        /* try next */
      }
    }
  }
  return "";
}

export async function verifyWorkforceToken(token: string): Promise<WorkforcePayload | null> {
  for (const key of secretKeys()) {
    try {
      const { payload } = await jwtVerify(token, key);
      const claims = payloadFromClaims(payload as Record<string, unknown>);
      if (claims) return claims;
    } catch {
      /* try next secret */
    }
  }

  return verifyViaWorkforceApi(token);
}
