const TOKEN_KEY = "hs_guest_token";
const USER_KEY = "hs_guest_user";

export type GuestUser = {
  id: string;
  email: string;
  fullName: string;
  currentRole: "EMPLOYEE" | "MANAGER" | "HR" | "ADMIN";
  accountType: "EMPLOYEE" | "ADMIN";
  /** From Workforce profile (`mobileNo`) when available */
  phone?: string;
};

export function getAuthFromStorage(): { token: string; user: GuestUser | null } {
  if (typeof window === "undefined") return { token: "", user: null };
  const token = localStorage.getItem(TOKEN_KEY) || "";
  const raw = localStorage.getItem(USER_KEY) || "";
  if (!raw) return { token, user: null };
  try {
    return { token, user: JSON.parse(raw) as GuestUser };
  } catch {
    return { token, user: null };
  }
}

export function setAuthInStorage(token: string, user: GuestUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("hs-auth-changed"));
}

export function clearAuthInStorage() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event("hs-auth-changed"));
}
