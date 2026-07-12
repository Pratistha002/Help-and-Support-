import { NextRequest } from "next/server";
import { bearerToken, verifyToken } from "./jwt";

export async function getOptionalUser(req: NextRequest) {
  const token = bearerToken(req.headers.get("authorization"));
  if (!token) return null;
  return verifyToken(token);
}

export async function requireUser(req: NextRequest) {
  const user = await getOptionalUser(req);
  if (!user?.sub) throw new Error("Login required");
  return user;
}

export async function requireAdmin(req: NextRequest) {
  const user = await requireUser(req);
  if (user.accountType !== "ADMIN" && user.currentRole !== "HR") {
    throw new Error("Admin or HR access required");
  }
  return user;
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export function errorResponse(message: string, status = 400) {
  return Response.json({ message, error: message }, { status });
}
