/**
 * InterviewX deep links — mirrors Employeemanage TalentX helpers for navbar parity.
 */

function clean(v?: string) {
  return String(v || "").trim();
}

function normalizeOrigin(raw: string): string {
  return clean(raw).replace(/\/$/, "");
}

function interviewXBase(): string {
  const explicit = normalizeOrigin(
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_INTERVIEWX_ORIGIN || "" : ""
  );
  if (explicit) return explicit;

  const fromSaarthix = normalizeOrigin(
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SAARTHIX_URL || "" : ""
  );
  if (fromSaarthix) return fromSaarthix;

  if (typeof window !== "undefined") {
    const { hostname, protocol, port } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${protocol}//${hostname}:3300/interviewx`;
    }
    if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
      const p = port ? `:${port}` : "";
      let o = normalizeOrigin(`${protocol}//${hostname}${p}`);
      if (o && !o.endsWith("/interviewx")) o = `${o}/interviewx`;
      return o;
    }
  }

  return "http://localhost:3300/interviewx";
}

export function buildInterviewXManagerDashboardUrl(): string {
  return `${interviewXBase()}/industry/ai-interview/dashboard`;
}

export function buildInterviewXManagerDashboardUrlWithSso(opts: {
  token: string;
  email?: string;
  name?: string;
  userType?: string;
}): string {
  const u = new URL(buildInterviewXManagerDashboardUrl());
  const t = clean(opts?.token);
  if (t) u.searchParams.set("token", t);
  const email = clean(opts?.email);
  if (email) u.searchParams.set("email", email);
  const name = clean(opts?.name);
  if (name) u.searchParams.set("name", name);
  const userType = clean(opts?.userType);
  if (userType) u.searchParams.set("userType", userType);
  return u.toString();
}

export function buildInterviewXManagerLandingUrl(): string {
  return `${interviewXBase()}/industry/ai-interview`;
}

export function buildInterviewXManagerLandingUrlWithSso(opts: {
  token: string;
  email?: string;
  name?: string;
  userType?: string;
}): string {
  const u = new URL(buildInterviewXManagerLandingUrl());
  const t = clean(opts?.token);
  if (t) u.searchParams.set("token", t);
  const email = clean(opts?.email);
  if (email) u.searchParams.set("email", email);
  const name = clean(opts?.name);
  if (name) u.searchParams.set("name", name);
  const userType = clean(opts?.userType);
  if (userType) u.searchParams.set("userType", userType);
  return u.toString();
}

export function buildInterviewXWalletUrlWithSso(opts: {
  token: string;
  email?: string;
  name?: string;
  userType?: string;
}): string {
  const u = new URL(`${interviewXBase()}/industry/wallet`);
  const t = clean(opts?.token);
  if (t) u.searchParams.set("token", t);
  const email = clean(opts?.email);
  if (email) u.searchParams.set("email", email);
  const name = clean(opts?.name);
  if (name) u.searchParams.set("name", name);
  const userType = clean(opts?.userType);
  if (userType) u.searchParams.set("userType", userType);
  return u.toString();
}

export function buildInterviewXAdminLoginUrl(): string {
  return `${interviewXBase()}/admin/login`;
}

export function buildInterviewXStudentPrepHomeUrl(opts?: {
  email?: string;
  name?: string;
  role?: string;
}): string {
  const base = interviewXBase();
  const role = clean(opts?.role);
  const path = role
    ? `${base}/students/interview-preparation/technical`
    : `${base}/students/interview-preparation`;
  const u = new URL(path);
  const email = clean(opts?.email);
  const name = clean(opts?.name);
  if (email) u.searchParams.set("email", email);
  if (name) u.searchParams.set("name", name);
  if (role) u.searchParams.set("role", role);
  return u.toString();
}

export function buildInterviewXStudentPrepHomeUrlWithSso(opts: {
  token: string;
  email?: string;
  name?: string;
  role?: string;
}): string {
  const u = new URL(
    buildInterviewXStudentPrepHomeUrl({
      email: opts.email,
      name: opts.name,
      role: opts.role,
    }),
  );
  const t = clean(opts?.token);
  if (t) u.searchParams.set("token", t);
  const email = clean(opts?.email);
  if (email) u.searchParams.set("email", email);
  const name = clean(opts?.name);
  if (name) u.searchParams.set("name", name);
  u.searchParams.set("userType", "STUDENT");
  return u.toString();
}
