import { getAuthFromStorage, type GuestUser } from "./auth";

const ORG_TOKEN_KEY = "jbv2_org_token";
const ORG_USER_KEY = "jbv2_org_user";

type OrgUserLike = {
  id: string;
  email: string;
  fullName: string;
  accountType: "EMPLOYEE" | "ADMIN";
  currentRole: "EMPLOYEE" | "MANAGER" | "HR";
};

function readOrgAuthFromStorage(): { token: string; user: OrgUserLike | null } {
  if (typeof window === "undefined") return { token: "", user: null };
  const token = localStorage.getItem(ORG_TOKEN_KEY) || "";
  const raw = localStorage.getItem(ORG_USER_KEY) || "";
  if (!raw) return { token, user: null };
  try {
    return { token, user: JSON.parse(raw) as OrgUserLike };
  } catch {
    return { token, user: null };
  }
}

function orgUserToGuest(user: OrgUserLike): GuestUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    accountType: user.accountType,
    currentRole: user.accountType === "ADMIN" ? "ADMIN" : user.currentRole || "EMPLOYEE",
  };
}

export type SupportAuth = {
  token: string;
  user: GuestUser | null;
  source: "hs" | "org" | null;
};

/**
 * Prefer Help & Support guest auth; fall back to Workforce org auth on the same origin.
 * Note: org JWT alone cannot call Help APIs — callers should run syncWorkforceAuthFromPage first.
 */
export function resolveSupportAuth(): SupportAuth {
  const hs = getAuthFromStorage();
  if (hs.token && hs.user) {
    return { token: hs.token, user: hs.user, source: "hs" };
  }

  const org = readOrgAuthFromStorage();
  if (org.token && org.user) {
    return { token: org.token, user: orgUserToGuest(org.user), source: "org" };
  }

  return { token: "", user: null, source: null };
}

export function clearAllSupportAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("hs_guest_token");
  localStorage.removeItem("hs_guest_user");
  localStorage.removeItem(ORG_TOKEN_KEY);
  localStorage.removeItem(ORG_USER_KEY);
  window.dispatchEvent(new Event("hs-auth-changed"));
  window.dispatchEvent(new Event("jbv2-org-auth-changed"));
}
