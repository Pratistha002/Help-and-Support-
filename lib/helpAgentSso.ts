import { setAuthInStorage, type GuestUser } from "./auth";

/** Read help-agent SSO params set by Employeemanage after login. */
export function readHelpAgentSsoFromUrl(): { token: string; user: GuestUser } | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const token = params.get("hsToken")?.trim();
  const email = params.get("hsEmail")?.trim().toLowerCase();
  const fullName = params.get("hsName")?.trim() || email?.split("@")[0] || "Agent";
  const id = params.get("hsId")?.trim() || email || "";
  if (!token || !email) return null;
  return {
    token,
    user: {
      id,
      email,
      fullName,
      currentRole: "ADMIN",
      accountType: "ADMIN",
    },
  };
}

export function stripHelpAgentSsoFromUrl() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  if (!params.has("hsToken")) return;
  ["hsToken", "hsEmail", "hsName", "hsId"].forEach((k) => params.delete(k));
  const qs = params.toString();
  window.history.replaceState({}, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
}

export function applyHelpAgentSsoFromUrl(): boolean {
  const sso = readHelpAgentSsoFromUrl();
  if (!sso) return false;
  setAuthInStorage(sso.token, sso.user);
  stripHelpAgentSsoFromUrl();
  return true;
}
