"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type CSSProperties } from "react";
import { appPath } from "@/lib/apiBase";

const footerLinkStyle = (active: boolean): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 12px",
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 11,
  textDecoration: "none",
  background: active ? "rgba(99,102,241,0.35)" : "rgba(255,255,255,0.08)",
  color: active ? "#a5b4fc" : "rgba(255,255,255,0.75)",
  border: "1px solid rgba(255,255,255,0.1)",
});

export function SiteFooter() {
  const pathname = usePathname();
  const isHelp = pathname?.startsWith("/help-and-support");
  const isAdmin = pathname?.startsWith("/admin");
  const helpHref = appPath("/help-and-support");
  const adminHref = appPath("/admin");

  return (
    <footer
      style={{
        marginTop: 20,
        padding: "10px clamp(16px, 3vw, 24px)",
        background: "#0f172a",
        marginLeft: "calc(50% - 50vw)",
        marginRight: "calc(50% - 50vw)",
        width: "100vw",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: 600 }}>
          © Saarthi Workforce
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Link href={helpHref} style={footerLinkStyle(Boolean(isHelp))}>
            💬 Help & Support
          </Link>
          {isHelp ? (
            <Link href={adminHref} style={footerLinkStyle(Boolean(isAdmin))}>
              🛡️ Admin
            </Link>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
