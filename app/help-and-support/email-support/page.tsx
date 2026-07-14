"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { appPath } from "@/lib/apiBase";
import type { GuestUser } from "@/lib/auth";
import { supportApi } from "@/lib/supportApi";
import { SUPPORT_EMAIL, resolveConsumerType } from "@/lib/supportConstants";
import { SupportAuthGuard } from "../../components/support/SupportAuthGuard";
import "../../components/support/help.css";

function EmailSupportForm({ user }: { user: GuestUser }) {
  const [supportEmail, setSupportEmail] = useState(SUPPORT_EMAIL);
  const [form, setForm] = useState({
    name: user.fullName || "",
    email: user.email || "",
    phone: "",
    subject: "",
    message: "",
  });
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supportApi
      .getSupportConfig()
      .then((c) => {
        if (c?.supportEmail) setSupportEmail(c.supportEmail);
      })
      .catch(() => null);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const r = await supportApi.emailInquiry({
        ...form,
        consumerType: resolveConsumerType(user),
      });
      setDone(r.ticketNumber || "submitted");
    } catch (err: any) {
      setError(err?.message || "Failed to send email");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sx-help-page">
      <div className="sx-help-layout">
        <Link href={appPath("/help-and-support")} className="sx-form-back">
          ← Help & Support
        </Link>

        <section className="sx-form-hero sx-email-hero">
          <h1>Email Support</h1>
          <p>
            Send us a detailed message and our team will respond within 24 hours. A support ticket is
            created automatically for every inquiry.
          </p>
        </section>

        <div className="sx-email-layout">
          <aside className="sx-email-aside">
            <div className="sx-email-info-card">
              <span className="sx-email-info-icon">✉️</span>
              <h3>Contact us</h3>
              <a href={`mailto:${supportEmail}`} className="sx-email-address">
                {supportEmail}
              </a>
            </div>
            <div className="sx-email-info-card">
              <span className="sx-email-info-icon">⏱️</span>
              <h3>Response time</h3>
              <p>We typically reply within <b>24 hours</b> on business days (Mon–Fri).</p>
            </div>
            <div className="sx-email-info-card">
              <span className="sx-email-info-icon">💡</span>
              <h3>Before you write</h3>
              <p>Check our <Link href={appPath("/help-and-support")}>FAQs</Link> or try the AI assistant for instant answers.</p>
            </div>
          </aside>

          <div className="sx-form-wrap sx-email-form-wrap">
            {done ? (
              <div className="sx-form-success">
                <div className="sx-form-success-icon sx-email-success-icon">✉️</div>
                <h3>Email sent!</h3>
                <p>
                  Your message has been received. Ticket <span className="ticket-num">{done}</span> was
                  created — track its status anytime.
                </p>
                <div className="sx-email-success-actions">
                  <Link href={appPath("/help-and-support/track-tickets")} className="sx-form-success-btn">
                    Track ticket →
                  </Link>
                  <Link href={appPath("/help-and-support")} className="sx-form-success-btn secondary">
                    Back to Help
                  </Link>
                </div>
              </div>
            ) : (
              <div className="sx-form-card">
                <h2>Send a message</h2>
                <p className="sx-form-sub">
                  Signed in as <b>{user.email}</b> · sending to <b>{supportEmail}</b>
                </p>

                <form onSubmit={submit}>
                  <div className="sx-form-grid">
                    <div className="sx-form-field">
                      <label htmlFor="email-name">Your name</label>
                      <input
                        id="email-name"
                        required
                        placeholder="John Doe"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      />
                    </div>
                    <div className="sx-form-field">
                      <label htmlFor="email-addr">Email address</label>
                      <input
                        id="email-addr"
                        required
                        type="email"
                        placeholder="you@company.com"
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="sx-form-field">
                    <label htmlFor="email-phone">Phone (optional — for SMS updates)</label>
                    <input
                      id="email-phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    />
                  </div>

                  <div className="sx-form-field">
                    <label htmlFor="email-subject">Subject</label>
                    <input
                      id="email-subject"
                      required
                      placeholder="What is your inquiry about?"
                      value={form.subject}
                      onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                    />
                  </div>

                  <div className="sx-form-field">
                    <label htmlFor="email-message">Message</label>
                    <textarea
                      id="email-message"
                      required
                      placeholder="Write your message here. Include any relevant details so we can help you faster."
                      rows={6}
                      value={form.message}
                      onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    />
                  </div>

                  {error ? <p className="sx-form-error">{error}</p> : null}

                  <button type="submit" className="sx-form-submit sx-email-submit" disabled={submitting}>
                    {submitting ? "Sending…" : "Send email"}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EmailSupportPage() {
  return (
    <SupportAuthGuard featureLabel="email support" returnPath="/help-and-support/email-support">
      {(auth) => <EmailSupportForm user={auth.user!} />}
    </SupportAuthGuard>
  );
}
