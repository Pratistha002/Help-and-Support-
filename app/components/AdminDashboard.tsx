"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";

const fade = { opacity: 0, y: 22 };
const fadeIn = { opacity: 1, y: 0 };

const ADMIN_SECTIONS = [
  {
    title: "Organization settings",
    desc: "Company profile, departments, industries, and role templates.",
    icon: "🏢",
    accent: "#3b82f6",
    items: ["Company name & logo", "Department structure", "Industry mappings"],
  },
  {
    title: "User & access control",
    desc: "Manage admins, managers, HR accounts, and permission levels.",
    icon: "🔐",
    accent: "#8b5cf6",
    items: ["Admin accounts", "Role permissions", "SSO configuration"],
  },
  {
    title: "Employee onboarding",
    desc: "Bulk invite rules, welcome emails, and profile requirements.",
    icon: "📤",
    accent: "#10b981",
    items: ["Invite templates", "Email notifications", "Mandatory profile fields"],
  },
  {
    title: "Reports & audit logs",
    desc: "Export preparation data, test results, and system activity.",
    icon: "📋",
    accent: "#f97316",
    items: ["Activity audit trail", "CSV exports", "Scheduled reports"],
  },
];

const RECENT_ACTIONS = [
  { who: "Priya Sharma", action: "Updated department list", when: "2h ago" },
  { who: "System", action: "Bulk invite completed (12 accounts)", when: "5h ago" },
  { who: "Admin", action: "Changed default role template", when: "1d ago" },
  { who: "Priya Sharma", action: "Added HR user access", when: "2d ago" },
];

export function AdminDashboard() {
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3500);
  };

  return (
    <div style={{ display: "grid", gap: 18, position: "relative" }}>
      {toast ? <div style={toastStyle}>{toast}</div> : null}

      <motion.div initial={fade} animate={fadeIn} transition={{ duration: 0.5 }} style={banner}>
        <div style={blobA} />
        <div style={blobB} />
        <div style={{ position: "relative" }}>
          <div style={breadcrumb}>
            <Link href="/" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", fontWeight: 700, fontSize: 12 }}>
              ← Dashboard
            </Link>
            <span style={crumbSep}>›</span>
            <span style={crumbCur}>Admin</span>
          </div>
          <h1 style={bannerTitle}>Administration panel</h1>
          <p style={bannerSub}>
            Configure organization settings, manage access, and review system activity.{" "}
            <span style={{ opacity: 0.7 }}>(UI preview)</span>
          </p>
        </div>
      </motion.div>

      <div style={kpiGrid}>
        <KpiCard label="Total users" value="48" hint="Across all roles" icon="👥" accent="#3b82f6" />
        <KpiCard label="Admins" value="3" hint="Full access" icon="🛡️" accent="#8b5cf6" />
        <KpiCard label="Pending invites" value="5" hint="Awaiting first login" icon="✉️" accent="#f59e0b" />
        <KpiCard label="Active sessions" value="12" hint="Last 24 hours" icon="⚡" accent="#16a34a" />
      </div>

      <div style={twoCol}>
        {ADMIN_SECTIONS.map((section, i) => (
          <motion.div
            key={section.title}
            initial={fade}
            animate={fadeIn}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            className="manager-dash-card"
            style={{ ...card, ...cardAccent(section.accent) }}
          >
            <div style={cardTitle}>
              <span style={titleIcon(section.accent)}>{section.icon}</span>
              {section.title}
            </div>
            <p style={cardSub}>{section.desc}</p>
            <ul style={{ margin: "14px 0 0", paddingLeft: 18, color: "#475569", fontSize: 13, lineHeight: 1.7 }}>
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => showToast(`${section.title} — UI preview only`)}
              style={{ ...btnOutline, marginTop: 16 }}
            >
              Manage →
            </button>
          </motion.div>
        ))}
      </div>

      <div className="manager-dash-card" style={{ ...card, ...cardAccent("#6366f1") }}>
        <div style={cardTitle}>
          <span style={titleIcon("#6366f1")}>🕐</span>
          Recent admin activity
        </div>
        <p style={cardSub}>Latest configuration changes and system events.</p>
        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          {RECENT_ACTIONS.map((a, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 12,
                background: "#fff",
                border: "1px solid #e5e7eb",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, color: "#0f172a" }}>{a.action}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>by {a.who}</div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>{a.when}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, hint, icon, accent }: { label: string; value: string; hint?: string; icon?: string; accent: string }) {
  return (
    <div style={{ ...card, position: "relative", overflow: "hidden", display: "flex", alignItems: "center", gap: 14 }}>
      <div aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${accent}, ${accent}99)` }} />
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${accent}14`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: "#0f172a" }}>{value}</div>
        {hint ? <div style={{ fontSize: 12, color: "#94a3b8" }}>{hint}</div> : null}
      </div>
    </div>
  );
}

function cardAccent(accent: string): React.CSSProperties {
  return { boxShadow: `inset 0 3px 0 0 ${accent}, 0 4px 18px -10px rgba(15,23,42,0.08)` };
}

function titleIcon(accent: string): React.CSSProperties {
  return { width: 30, height: 30, borderRadius: 10, background: `${accent}14`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 14 };
}

const banner: React.CSSProperties = {
  borderRadius: 22,
  padding: "22px clamp(16px, 3vw, 24px)",
  background: "linear-gradient(135deg,#0f172a 0%,#1e293b 30%,#312e81 65%,#7c3aed 100%)",
  color: "#fff",
  position: "relative",
  overflow: "hidden",
  boxShadow: "0 16px 36px -22px rgba(99,102,241,0.55)",
};
const blobA: React.CSSProperties = { position: "absolute", top: -50, right: -30, width: 200, height: 200, borderRadius: "50%", background: "rgba(168,85,247,0.28)", pointerEvents: "none" };
const blobB: React.CSSProperties = { position: "absolute", bottom: -60, right: 110, width: 140, height: 140, borderRadius: "50%", background: "rgba(236,72,153,0.20)", pointerEvents: "none" };
const breadcrumb: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginBottom: 8 };
const crumbSep: React.CSSProperties = { color: "rgba(255,255,255,0.5)" };
const crumbCur: React.CSSProperties = { color: "#fff", fontWeight: 700 };
const bannerTitle: React.CSSProperties = { margin: 0, fontSize: 24, fontWeight: 900 };
const bannerSub: React.CSSProperties = { marginTop: 8, fontSize: 13, color: "rgba(255,255,255,0.78)", maxWidth: 560 };
const kpiGrid: React.CSSProperties = { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" };
const twoCol: React.CSSProperties = { display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" };
const card: React.CSSProperties = { background: "linear-gradient(180deg, #ffffff 0%, #fafbfc 100%)", border: "1px solid #e8eef5", borderRadius: 18, padding: 20 };
const cardTitle: React.CSSProperties = { fontSize: 15, fontWeight: 900, display: "flex", alignItems: "center", gap: 10 };
const cardSub: React.CSSProperties = { fontSize: 12, color: "#64748b", marginTop: 4 };
const btnOutline: React.CSSProperties = { border: "1px solid #cbd5e1", background: "#fff", padding: "9px 14px", borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: "pointer", color: "#0f172a" };
const toastStyle: React.CSSProperties = { position: "fixed", top: 72, right: 20, zIndex: 100, padding: "12px 16px", borderRadius: 12, background: "#0f172a", color: "#fff", fontSize: 13, fontWeight: 700, boxShadow: "0 8px 24px rgba(15,23,42,0.25)" };
