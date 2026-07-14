import { SignJWT, jwtVerify } from "jose";
import type { GuestUser } from "../auth";
import { readEnv } from "./env";

export type TokenPayload = {
  sub: string;
  email: string;
  fullName: string;
  currentRole: GuestUser["currentRole"];
  accountType: GuestUser["accountType"];
  phone?: string;
};

function hsSecret(): Uint8Array {
  return new TextEncoder().encode(readEnv().jwtSecret);
}

export async function signToken(user: GuestUser): Promise<string> {
  const claims: Record<string, unknown> = {
    email: user.email,
    fullName: user.fullName,
    currentRole: user.currentRole,
    accountType: user.accountType,
  };
  if (user.phone) claims.phone = user.phone;

  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(hsSecret());
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, hsSecret());
    const phone = String(payload.phone || "").trim();
    return {
      sub: String(payload.sub || ""),
      email: String(payload.email || ""),
      fullName: String(payload.fullName || ""),
      currentRole: (payload.currentRole as TokenPayload["currentRole"]) || "EMPLOYEE",
      accountType: (payload.accountType as TokenPayload["accountType"]) || "EMPLOYEE",
      ...(phone ? { phone } : {}),
    };
  } catch {
    return null;
  }
}

export function bearerToken(auth?: string | null): string {
  if (!auth?.startsWith("Bearer ")) return "";
  return auth.slice(7).trim();
}
