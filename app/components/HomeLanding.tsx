"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1200&q=80";

export function HomeLanding() {
  return (
    <div
      style={{
        marginLeft: "calc(50% - 50vw)",
        marginRight: "calc(50% - 50vw)",
        width: "100vw",
        minHeight: "calc(100vh - 120px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px clamp(20px, 5vw, 48px)",
        background: "linear-gradient(180deg, #f0f4ff 0%, #f8fafc 50%, #ffffff 100%)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 40,
          alignItems: "center",
          maxWidth: 1000,
          width: "100%",
        }}
      >
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          style={{ borderRadius: 24, overflow: "hidden", boxShadow: "0 24px 60px -20px rgba(99,102,241,0.35)" }}
        >
          <img
            src={HERO_IMAGE}
            alt="Team collaboration at work"
            style={{ width: "100%", height: "auto", display: "block", objectFit: "cover", minHeight: 280 }}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{ textAlign: "center" }}
        >
          <h1 style={{ margin: 0, fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 900, color: "#0f172a", lineHeight: 1.15 }}>
            Saarthi Workforce
          </h1>
          <p style={{ margin: "14px 0 32px", color: "#64748b", fontSize: 16, lineHeight: 1.6 }}>
            Employee support hub — get help, talk to an agent, or manage support as admin.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 320, margin: "0 auto" }}>
            <Link
              href="/help-and-support/"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                padding: "16px 28px",
                borderRadius: 14,
                fontWeight: 900,
                fontSize: 16,
                textDecoration: "none",
                color: "#fff",
                background: "linear-gradient(135deg, #4338ca 0%, #6366f1 50%, #818cf8 100%)",
                boxShadow: "0 8px 28px -8px rgba(99,102,241,0.55)",
              }}
            >
              <span style={{ fontSize: 20 }}>💬</span>
              Help and Support
            </Link>

            <Link
              href="/admin/"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                padding: "16px 28px",
                borderRadius: 14,
                fontWeight: 900,
                fontSize: 16,
                textDecoration: "none",
                color: "#0f172a",
                background: "#fff",
                border: "2px solid #e2e8f0",
                boxShadow: "0 4px 18px -8px rgba(15,23,42,0.12)",
              }}
            >
              <span style={{ fontSize: 20 }}>🛡️</span>
              Admin
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
