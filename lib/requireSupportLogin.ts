import { appPath, workforcePath } from "@/lib/apiBase";
import { resolveSupportAuth } from "@/lib/resolveSupportAuth";

/** True when the user has Workforce or Help & Support session credentials. */
export function isSupportLoggedIn(): boolean {
  const auth = resolveSupportAuth();
  return Boolean(auth.token && auth.user);
}

export function buildSupportReturnUrl(path = "/help-and-support"): string {
  if (typeof window === "undefined") return appPath(path);
  try {
    return new URL(appPath(path), window.location.origin).toString();
  } catch {
    return appPath(path);
  }
}

export function workforceLoginUrls(returnPath?: string) {
  const returnUrl = encodeURIComponent(buildSupportReturnUrl(returnPath || "/help-and-support"));
  return {
    employee: `${workforcePath("/auth/employee/login")}?returnUrl=${returnUrl}`,
    manager: `${workforcePath("/auth/manager/login")}?returnUrl=${returnUrl}`,
  };
}
