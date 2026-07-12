import { jwtVerify } from "jose";
import { readEnv } from "./env";

export type WorkforcePayload = {
  sub: string;
  email: string;
  fullName?: string;
  accountType: "EMPLOYEE" | "ADMIN";
  currentRole: "EMPLOYEE" | "MANAGER" | "HR" | "ADMIN";
};

function secretKeys(): Uint8Array[] {
  const env = readEnv();
  const raw = [
    process.env.ORG_AUTH_JWT_SECRET,
    env.jwtSecret,
    process.env.JWT_SECRET,
  ].filter(Boolean) as string[];
  const unique = [...new Set(raw)];
  return unique.map((s) => new TextEncoder().encode(s));
}

export async function verifyWorkforceToken(token: string): Promise<WorkforcePayload | null> {
  for (const key of secretKeys()) {
    try {
      const { payload } = await jwtVerify(token, key);
      const sub = String(payload.sub || "");
      const email = String(payload.email || "");
      if (!sub || !email) continue;
      const accountType = (payload.accountType as WorkforcePayload["accountType"]) || "EMPLOYEE";
      let currentRole = (payload.currentRole as WorkforcePayload["currentRole"]) || "EMPLOYEE";
      if (accountType === "ADMIN") currentRole = "ADMIN";
      return {
        sub,
        email,
        fullName: String((payload as any).fullName || (payload as any).name || ""),
        accountType,
        currentRole,
      };
    } catch {
      /* try next secret */
    }
  }
  return null;
}
