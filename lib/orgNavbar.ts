import { getWorkforceAppUrl } from "./apiBase";

export type RoleRecommendationStatus = "PENDING" | "SEEN" | "DISMISSED" | "ACCEPTED";

export type RoleRecommendation = {
  _id: string;
  status: RoleRecommendationStatus;
  roleName: string;
  recommendedByName?: string;
  recommendedByEmail?: string;
  recommendedByRole?: string;
  note?: string;
};

async function workforceJson<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getWorkforceAppUrl();
  const res = await fetch(`${base}${path}`, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { message?: string })?.message || "Request failed");
  }
  return data as T;
}

export async function orgListMyRecommendations(token: string) {
  return workforceJson<RoleRecommendation[]>(`/api/org-auth/recommendations/inbox`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function orgUpdateRecommendationStatus(token: string, id: string, status: RoleRecommendationStatus) {
  return workforceJson<RoleRecommendation>(`/api/org-auth/recommendations/${encodeURIComponent(id)}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status }),
  });
}
