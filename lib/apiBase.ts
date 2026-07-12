export function apiUrl(pathAndQuery: string): string {
  let p = pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`;
  if (p.includes("?")) {
    const qi = p.indexOf("?");
    let pathname = p.slice(0, qi);
    const qs = p.slice(qi);
    if (!pathname.endsWith("/")) pathname += "/";
    return pathname + qs;
  }
  return p.endsWith("/") ? p : `${p}/`;
}

export function appPath(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return p.endsWith("/") ? p : `${p}/`;
}

/** Saarthi Workforce (Employeemanage) app origin — logo, dashboard, profile, login links. */
export function getWorkforceAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_WORKFORCE_APP_URL?.trim() || "http://localhost:3002";
  return raw.replace(/\/$/, "");
}

export function workforcePath(path: string): string {
  const base = getWorkforceAppUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  const joined = `${base}${p}`;
  return joined.endsWith("/") ? joined : `${joined}/`;
}

export function publicAssetUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const local = `${p}`;
  if (typeof window !== "undefined") {
    return local;
  }
  return local;
}

/** Brand logo and static assets — served from this app's `public/` folder (no port 3002 dependency). */
export function brandAssetUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const local = publicAssetUrl(p);
  if (p.endsWith(".png")) {
    return local.replace(/\.png$/, ".svg");
  }
  return local;
}
