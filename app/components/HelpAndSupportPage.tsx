"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";

const fade = { opacity: 0, y: 22 };
const fadeIn = { opacity: 1, y: 0 };

const FAQ_ITEMS = [
  {
    q: "How do I invite employees in bulk?",
    a: "Go to the Employee Management dashboard, use the “Invite employees from Excel” card, download the template, fill in Email and Name columns (plus Department for HR), then upload the file.",
  },
  {
    q: "What is the difference between Manager and HR view?",
    a: "Managers see employees in their department only. HR can view all departments, filter by industry, and manage cross-department invites and recommendations.",
  },
  {
    q: "How do I recommend a role to an employee?",
    a: "In the employee table, click “Recommend role” on any row. You’ll be guided to pick a target role scoped to the employee’s department.",
  },
  {
    q: "Where can I see preparation progress?",
    a: "KPI cards and the progress distribution chart show team-wide stats. Per-employee progress is in the “Avg progress” column; click a role under “Track” for detailed analytics.",
  },
  {
    q: "Who can access the Admin panel?",
    a: "Only users with Admin role can change organization settings, access controls, and audit logs. Contact your system administrator if you need access.",
  },
];

const CONTACT_OPTIONS = [
  { icon: "📧", label: "Email support", value: "support@acmecorp.com", hint: "Response within 24 hours" },
  { icon: "📞", label: "Phone", value: "+91 1800-XXX-XXXX", hint: "Mon–Fri, 9 AM – 6 PM IST" },
  { icon: "💬", label: "Live chat", value: "Available in app", hint: "Business hours only" },
];

export function HelpAndSupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setForm({ name: "", email: "", subject: "", message: "" });
    window.setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <motion.div initial={fade} animate={fadeIn} transition={{ duration: 0.5 }} style={banner}>
        <div style={blobA} />
        <div style={blobB} />
        <div style={{ position: "relative" }}>
          <div style={breadcrumb}>
            <Link href="/" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", fontWeight: 700, fontSize: 12 }}>
              ← Dashboard
            </Link>
            <span style={crumbSep}>›</span>
            <span style={crumbCur}>Help and Support</span>
          </div>
          <h1 style={bannerTitle}>How can we help you?</h1>
          <p style={bannerSub}>
            Browse FAQs, contact our team, or submit a support request. We&apos;re here to help you get the most out of Employee Management.
          </p>
        </div>
      </motion.div>

      <div style={twoCol}>
        <div className="manager-dash-card" style={{ ...card, ...cardAccent("#3b82f6") }}>
          <div style={cardTitle}>
            <span style={titleIcon("#3b82f6")}>❓</span>
            Frequently asked questions
          </div>
          <p style={cardSub}>Quick answers to common questions about the platform.</p>
          <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
            {FAQ_ITEMS.map((item, i) => {
              const open = openFaq === i;
              return (
                <div key={item.q} style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : i)}
                    style={{
                      width: "100%",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      padding: "14px 16px",
                      border: "none",
                      background: open ? "#f8fafc" : "#fff",
                      cursor: "pointer",
                      textAlign: "left",
                      fontWeight: 800,
                      fontSize: 14,
                      color: "#0f172a",
                    }}
                  >
                    <span>{item.q}</span>
                    <span style={{ color: "#6366f1", fontSize: 18, flexShrink: 0 }}>{open ? "−" : "+"}</span>
                  </button>
                  {open ? (
                    <div style={{ padding: "0 16px 14px", fontSize: 13, color: "#475569", lineHeight: 1.6 }}>{item.a}</div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "grid", gap: 18 }}>
          <div className="manager-dash-card" style={{ ...card, ...cardAccent("#10b981") }}>
            <div style={cardTitle}>
              <span style={titleIcon("#10b981")}>📬</span>
              Contact us
            </div>
            <p style={cardSub}>Reach our support team directly.</p>
            <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
              {CONTACT_OPTIONS.map((opt) => (
                <div
                  key={opt.label}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: "#f8fafc",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <span style={{ fontSize: 20 }}>{opt.icon}</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13 }}>{opt.label}</div>
                    <div style={{ fontSize: 14, color: "#0f172a", marginTop: 2 }}>{opt.value}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{opt.hint}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="manager-dash-card" style={{ ...card, ...cardAccent("#8b5cf6") }}>
            <div style={cardTitle}>
              <span style={titleIcon("#8b5cf6")}>📚</span>
              Quick links
            </div>
            <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
              <Link href="/" style={quickLink}>Employee Management dashboard</Link>
              <Link href="/admin/" style={quickLink}>Admin panel</Link>
              <a href="#" onClick={(e) => e.preventDefault()} style={quickLink}>User guide (PDF)</a>
              <a href="#" onClick={(e) => e.preventDefault()} style={quickLink}>Video tutorials</a>
            </div>
          </div>
        </div>
      </div>

      <div className="manager-dash-card" style={{ ...card, ...cardAccent("#6366f1") }}>
        <div style={cardTitle}>
          <span style={titleIcon("#6366f1")}>✉️</span>
          Submit a support request
        </div>
        <p style={cardSub}>Describe your issue and we&apos;ll get back to you. (UI preview — form does not send data.)</p>

        {submitted ? (
          <div style={successBox}>
            <span style={{ fontSize: 20 }}>✅</span>
            <div>
              <div style={{ fontWeight: 900, color: "#065f46" }}>Request submitted</div>
              <div style={{ fontSize: 13, color: "#047857", marginTop: 4 }}>This is a UI preview. In production, your message would be sent to the support team.</div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ marginTop: 18, display: "grid", gap: 14, maxWidth: 640 }}>
            <div style={formRow}>
              <label style={labelStyle}>
                Name
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Your full name"
                  style={inputStyle}
                  className="manager-toolbar-field"
                />
              </label>
              <label style={labelStyle}>
                Email
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="you@company.com"
                  style={inputStyle}
                  className="manager-toolbar-field"
                />
              </label>
            </div>
            <label style={labelStyle}>
              Subject
              <input
                required
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="Brief summary of your issue"
                style={inputStyle}
                className="manager-toolbar-field"
              />
            </label>
            <label style={labelStyle}>
              Message
              <textarea
                required
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                placeholder="Describe your issue in detail…"
                rows={5}
                style={{ ...inputStyle, resize: "vertical", minHeight: 120 }}
                className="manager-toolbar-field"
              />
            </label>
            <button type="submit" style={btnPrimary}>Send request</button>
          </form>
        )}
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
  background: "linear-gradient(135deg,#054a90 0%,#3170a5 40%,#4f46e5 100%)",
  color: "#fff",
  position: "relative",
  overflow: "hidden",
  boxShadow: "0 16px 36px -22px rgba(79,70,229,0.45)",
};
const blobA: React.CSSProperties = { position: "absolute", top: -40, right: -20, width: 180, height: 180, borderRadius: "50%", background: "rgba(56,189,248,0.25)", pointerEvents: "none" };
const blobB: React.CSSProperties = { position: "absolute", bottom: -50, right: 100, width: 120, height: 120, borderRadius: "50%", background: "rgba(99,102,241,0.30)", pointerEvents: "none" };
const breadcrumb: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginBottom: 8 };
const crumbSep: React.CSSProperties = { color: "rgba(255,255,255,0.5)" };
const crumbCur: React.CSSProperties = { color: "#fff", fontWeight: 700 };
const bannerTitle: React.CSSProperties = { margin: 0, fontSize: 26, fontWeight: 900 };
const bannerSub: React.CSSProperties = { marginTop: 8, fontSize: 14, color: "rgba(255,255,255,0.85)", maxWidth: 600, lineHeight: 1.5 };
const twoCol: React.CSSProperties = { display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" };
const card: React.CSSProperties = { background: "linear-gradient(180deg, #ffffff 0%, #fafbfc 100%)", border: "1px solid #e8eef5", borderRadius: 18, padding: 20 };
const cardTitle: React.CSSProperties = { fontSize: 15, fontWeight: 900, display: "flex", alignItems: "center", gap: 10 };
const cardSub: React.CSSProperties = { fontSize: 12, color: "#64748b", marginTop: 4 };
const quickLink: React.CSSProperties = {
  display: "block",
  padding: "10px 14px",
  borderRadius: 10,
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  color: "#4338ca",
  fontWeight: 800,
  fontSize: 13,
  textDecoration: "none",
};
const formRow: React.CSSProperties = { display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" };
const labelStyle: React.CSSProperties = { display: "grid", gap: 6, fontSize: 13, fontWeight: 800, color: "#0f172a" };
const inputStyle: React.CSSProperties = { minHeight: 42, borderRadius: 10, border: "1px solid #cbd5e1", padding: "10px 12px", fontSize: 14, background: "#fff", width: "100%" };
const btnPrimary: React.CSSProperties = {
  justifySelf: "start",
  padding: "12px 22px",
  borderRadius: 12,
  border: "none",
  fontWeight: 900,
  fontSize: 14,
  cursor: "pointer",
  color: "#fff",
  background: "linear-gradient(135deg, #4338ca 0%, #6366f1 50%, #818cf8 100%)",
  boxShadow: "0 4px 14px -4px rgba(99, 102, 241, 0.55)",
};
const successBox: React.CSSProperties = {
  marginTop: 18,
  display: "flex",
  gap: 12,
  alignItems: "flex-start",
  padding: "16px 18px",
  borderRadius: 14,
  background: "#ecfdf5",
  border: "1px solid #a7f3d0",
};
