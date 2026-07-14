"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { appPath } from "@/lib/apiBase";
import { getAuthFromStorage, type GuestUser } from "@/lib/auth";
import { supportApi } from "@/lib/supportApi";
import { resolveConsumerType } from "@/lib/supportConstants";
import "../../components/support/help.css";

const CATEGORIES = [
  "General",
  "Account & Login",
  "TalentX",
  "Manager Dashboard",
  "InterviewX",
  "Technical Support",
];

export default function SupportFormPage() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState<GuestUser | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    description: "",
    category: "General",
  });
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const stored = getAuthFromStorage();
    setToken(stored.token);
    setUser(stored.user);
    if (stored.user) {
      setForm((f) => ({
        ...f,
        name: f.name || stored.user?.fullName || "",
        email: f.email || stored.user?.email || "",
      }));
    }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const payload = { ...form, consumerType: resolveConsumerType(user) };
      const ticket = token
        ? await supportApi.createTicket(payload)
        : await supportApi.createGuestTicket(payload);
      setDone(ticket.ticketNumber || "created");
    } catch (err: any) {
      setError(err?.message || "Failed to create ticket");
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

        <section className="sx-form-hero">
          <h1>Create Ticket</h1>
          <p>Submit a support request and our team will get back to you. You can track progress anytime.</p>
        </section>

        <div className="sx-form-wrap">
          {done ? (
            <div className="sx-form-success">
              <div className="sx-form-success-icon">✓</div>
              <h3>Ticket submitted!</h3>
              <p>
                Your ticket <span className="ticket-num">{done}</span> has been created successfully.
                We&apos;ll review it and update the status shortly.
              </p>
              <Link href={appPath("/help-and-support/track-tickets")} className="sx-form-success-btn">
                Track my tickets →
              </Link>
            </div>
          ) : (
            <div className="sx-form-card">
              <h2>Support request</h2>
              <p className="sx-form-sub">Fill in the details below. All fields are required.</p>

              <form onSubmit={submit}>
                <div className="sx-form-grid">
                  <div className="sx-form-field">
                    <label htmlFor="ticket-name">Your name</label>
                    <input
                      id="ticket-name"
                      required
                      placeholder="John Doe"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div className="sx-form-field">
                    <label htmlFor="ticket-email">Email address</label>
                    <input
                      id="ticket-email"
                      required
                      type="email"
                      placeholder="you@company.com"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="sx-form-field">
                  <label htmlFor="ticket-phone">Phone (optional — for SMS updates)</label>
                  <input
                    id="ticket-phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>

                <div className="sx-form-field">
                  <label htmlFor="ticket-subject">Subject</label>
                  <input
                    id="ticket-subject"
                    required
                    placeholder="Brief summary of your issue"
                    value={form.subject}
                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  />
                </div>

                <div className="sx-form-field">
                  <label htmlFor="ticket-category">Category</label>
                  <select
                    id="ticket-category"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sx-form-field">
                  <label htmlFor="ticket-desc">Describe your issue</label>
                  <textarea
                    id="ticket-desc"
                    required
                    placeholder="Please include as much detail as possible — steps to reproduce, error messages, etc."
                    rows={5}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>

                {error ? <p className="sx-form-error">{error}</p> : null}

                <button type="submit" className="sx-form-submit" disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit ticket"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
