import { SignJWT, jwtVerify } from "jose";
import type { GuestUser } from "../auth";
import { readEnv } from "./env";

const secret = new TextEncoder().encode(readEnv().jwtSecret);

export type TokenPayload = {
  sub: string;
  email: string;
  fullName: string;
  currentRole: GuestUser["currentRole"];
  accountType: GuestUser["accountType"];
};

export async function signToken(user: GuestUser): Promise<string> {
  return new SignJWT({
    email: user.email,
    fullName: user.fullName,
    currentRole: user.currentRole,
    accountType: user.accountType,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      sub: String(payload.sub || ""),
      email: String(payload.email || ""),
      fullName: String(payload.fullName || ""),
      currentRole: (payload.currentRole as TokenPayload["currentRole"]) || "EMPLOYEE",
      accountType: (payload.accountType as TokenPayload["accountType"]) || "EMPLOYEE",
    };
  } catch {
    return null;
  }
}

export function bearerToken(auth?: string | null): string {
  if (!auth?.startsWith("Bearer ")) return "";
  return auth.slice(7).trim();
}
