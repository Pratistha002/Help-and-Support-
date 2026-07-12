/** CORS helpers for cross-origin API calls (e.g. Saarthi Workforce on :3002 → Help & Support on :3003). */

const LOCAL_DEV_ORIGINS = [
  "http://localhost:3002",
  "http://localhost:3003",
  "http://localhost:3000",
  "http://127.0.0.1:3002",
  "http://127.0.0.1:3003",
];

export function getAllowedOrigins(): string[] {
  const origins = new Set<string>();
  const raw = process.env.APP_CORS_ALLOWED_ORIGINS?.trim();
  if (raw) {
    raw.split(",").forEach((part) => {
      const o = part.trim();
      if (o) origins.add(o);
    });
  }
  const workforce = process.env.NEXT_PUBLIC_WORKFORCE_APP_URL?.trim().replace(/\/$/, "");
  if (workforce) origins.add(workforce);
  if (!origins.size) LOCAL_DEV_ORIGINS.forEach((o) => origins.add(o));
  return Array.from(origins);
}

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return getAllowedOrigins().includes(origin);
}

export function corsHeaders(origin: string | null): HeadersInit {
  if (!origin || !isAllowedOrigin(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
