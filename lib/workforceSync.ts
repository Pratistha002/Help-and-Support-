import { getAuthFromStorage, setAuthInStorage, type GuestUser } from "./auth";

const ORG_TOKEN_KEY = "jbv2_org_token";
const ORG_USER_KEY = "jbv2_org_user";

export type WorkforceSyncInput = {
  token: string;
  email?: string;
  fullName?: string;
  name?: string;
  phone?: string;
  mobileNo?: string;
  currentRole?: GuestUser["currentRole"];
  accountType?: GuestUser["accountType"];
  userType?: string;
};

function parseUserType(userType?: string): { accountType: GuestUser["accountType"]; currentRole: GuestUser["currentRole"] } {
  const t = String(userType || "").trim().toUpperCase();
  if (t === "ADMIN") return { accountType: "ADMIN", currentRole: "ADMIN" };
  if (t === "MANAGER") return { accountType: "EMPLOYEE", currentRole: "MANAGER" };
  if (t === "HR") return { accountType: "EMPLOYEE", currentRole: "HR" };
  return { accountType: "EMPLOYEE", currentRole: "EMPLOYEE" };
}

/**
 * Exchange TalentX / Employeemanage org JWT for a Help & Support session.
 * When `input.token` is present (URL SSO handoff), always re-sync so a stale guest
 * session cannot block the workforce identity.
 */
export async function syncWorkforceAuthToHelp(input?: WorkforceSyncInput): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const forceFromSso = Boolean(input?.token?.trim());
  const existing = getAuthFromStorage();
  // Re-sync when missing phone so profile mobileNo can fill support forms.
  if (!forceFromSso && existing.token && existing.user?.phone) return true;

  let token = input?.token?.trim() || "";
  let email = input?.email?.trim() || "";
  let fullName = (input?.fullName || input?.name || "").trim();
  let phone = (input?.phone || input?.mobileNo || "").trim();
  let accountType = input?.accountType;
  let currentRole = input?.currentRole;

  if (!token) {
    token = localStorage.getItem(ORG_TOKEN_KEY) || "";
    const raw = localStorage.getItem(ORG_USER_KEY) || "";
    if (raw) {
      try {
        const orgUser = JSON.parse(raw) as {
          id?: string;
          email?: string;
          fullName?: string;
          mobileNo?: string;
          phone?: string;
          accountType?: GuestUser["accountType"];
          currentRole?: GuestUser["currentRole"];
        };
        email = email || orgUser.email || "";
        fullName = fullName || orgUser.fullName || "";
        phone = phone || orgUser.mobileNo || orgUser.phone || "";
        accountType = accountType || orgUser.accountType;
        currentRole = currentRole || orgUser.currentRole;
      } catch {
        /* ignore */
      }
    }
  }

  if (input?.userType && !accountType) {
    const parsed = parseUserType(input.userType);
    accountType = parsed.accountType;
    currentRole = parsed.currentRole;
  }

  if (!token) return false;

  try {
    const res = await fetch("/api/auth/workforce-sync/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        email,
        fullName,
        name: fullName,
        phone,
        mobileNo: phone,
        currentRole,
        accountType,
        userType: input?.userType || currentRole || accountType,
      }),
    });
    if (!res.ok) {
      console.warn("[workforce-sync] failed", res.status, await res.text().catch(() => ""));
      return false;
    }

    const data = await res.json();
    const user = data.user as GuestUser;
    const hsToken = String(data.token || "");
    if (!hsToken || !user) return false;

    const orgUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      companyName: "",
      companyDomain: "",
      accountType: user.accountType,
      currentRole: user.accountType === "ADMIN" ? "ADMIN" : user.currentRole,
      mobileNo: user.phone || "",
      phone: user.phone || "",
    };

    localStorage.setItem(ORG_TOKEN_KEY, token);
    localStorage.setItem(ORG_USER_KEY, JSON.stringify(orgUser));
    setAuthInStorage(hsToken, user);
    window.dispatchEvent(new Event("jbv2-org-auth-changed"));
    window.dispatchEvent(new Event("workforce-help-sync-done"));
    return true;
  } catch (err) {
    console.warn("[workforce-sync] error", err);
    return false;
  }
}

/** Read SSO query params from the current URL (set by Employeemanage Help links). */
export function readWorkforceSsoFromUrl(): WorkforceSyncInput | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token")?.trim();
  if (!token) return null;
  return {
    token,
    email: params.get("email")?.trim() || "",
    fullName: params.get("name")?.trim() || "",
    phone: params.get("phone")?.trim() || params.get("mobile")?.trim() || "",
    userType: params.get("userType")?.trim() || "",
  };
}

export function stripWorkforceSsoFromUrl() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  if (!params.has("token")) return;
  params.delete("token");
  params.delete("email");
  params.delete("name");
  params.delete("phone");
  params.delete("mobile");
  params.delete("userType");
  const qs = params.toString();
  const next = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash || ""}`;
  window.history.replaceState({}, "", next);
}

/** Sync using URL SSO params if present, otherwise org localStorage / existing session. */
export async function syncWorkforceAuthFromPage(): Promise<boolean> {
  const fromUrl = readWorkforceSsoFromUrl();
  const ok = await syncWorkforceAuthToHelp(fromUrl || undefined);
  if (ok && fromUrl) stripWorkforceSsoFromUrl();
  return ok;
}
