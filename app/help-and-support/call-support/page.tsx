"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { appPath } from "@/lib/apiBase";
import { getAuthFromStorage, type GuestUser } from "@/lib/auth";
import { supportApi } from "@/lib/supportApi";
import { resolveConsumerType, SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL } from "@/lib/supportConstants";
import "../../components/support/help.css";

export default function CallSupportPage() {
  const [user, setUser] = useState<GuestUser | null>(null);
  const [form, setForm] = useState({
    callerName: "",
    phone: "",
    email: "",
  });
  const [done, setDone] = useState("");
  const [queuePos, setQueuePos] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [callConfig, setCallConfig] = useState<any>(null);

  useEffect(() => {
    const { user: stored } = getAuthFromStorage();
    setUser(stored);
    if (stored) {
      setForm((f) => ({
        ...f,
        callerName: f.callerName || stored.fullName || "",
        email: f.email || stored.email || "",
      }));
    }
    supportApi.getCallConfig().then(setCallConfig).catch(() => null);
  }, []);

  const phoneDisplay = callConfig?.supportPhoneDisplay || SUPPORT_PHONE_DISPLAY;
  const telUri = callConfig?.telUri || SUPPORT_PHONE_TEL;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      const r = await supportApi.requestCall({
        ...form,
        consumerType: resolveConsumerType(user),
      });
      if (!r.success) throw new Error(r.message || "Request failed");
      setDone(r.callbackReference || r.callbackRequestId || "submitted");
      setQueuePos(r.queuePosition ?? null);
    } catch (err: any) {
      setError(err?.message || "Failed to submit call request");
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

        <section className="sx-form-hero sx-call-hero">
          <h1>Request a Call</h1>
          <p>
            Enter your name and phone number. Our team will call you back — your request appears
            instantly in Call Management for our agents.
          </p>
        </section>

        <div className="sx-email-layout">
          <aside className="sx-email-aside">
            <div className="sx-email-info-card">
              <span className="sx-email-info-icon">📞</span>
              <h3>Call us directly</h3>
              <a href={telUri} className="sx-email-address">
                {phoneDisplay}
              </a>
            </div>
            <div className="sx-email-info-card">
              <span className="sx-email-info-icon">⏱️</span>
              <h3>Callback time</h3>
              <p>We typically call back within a few business hours after your request.</p>
            </div>
            <div className="sx-email-info-card">
              <span className="sx-email-info-icon">📋</span>
              <h3>Support ticket</h3>
              <p>Your request goes to Call Management first. An agent creates a ticket only if follow-up is needed after your call.</p>
            </div>
          </aside>

          <div className="sx-form-wrap sx-email-form-wrap">
            {done ? (
              <div className="sx-form-success">
                <div className="sx-form-success-icon sx-call-success-icon">📞</div>
                <h3>Callback request submitted!</h3>
                <p>
                  Reference <b>{done.startsWith("CB-") ? done : `…${String(done).slice(-6).toUpperCase()}`}</b>
                  {queuePos != null ? <> · Queue position <b>{queuePos}</b></> : null}
                  . We will call you on <b>{form.phone}</b> shortly. No support ticket has been created yet.
                </p>
                <div className="sx-email-success-actions">
                  <Link href={appPath("/help-and-support")} className="sx-form-success-btn">
                    Back to Help
                  </Link>
                </div>
              </div>
            ) : (
              <div className="sx-form-card">
                <h2>Callback request</h2>
                <p className="sx-form-sub">Include country code (e.g. +91 for India, +1 for US)</p>

                <form onSubmit={submit}>
                  <div className="sx-form-field">
                    <label htmlFor="call-name">Your name</label>
                    <input
                      id="call-name"
                      required
                      placeholder="Full name"
                      value={form.callerName}
                      onChange={(e) => setForm((f) => ({ ...f, callerName: e.target.value }))}
                    />
                  </div>

                  <div className="sx-form-field">
                    <label htmlFor="call-phone">Phone number</label>
                    <input
                      id="call-phone"
                      required
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    />
                  </div>

                  <div className="sx-form-field">
                    <label htmlFor="call-email">Email (optional)</label>
                    <input
                      id="call-email"
                      type="email"
                      placeholder="For confirmation email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </div>

                  {error ? <p className="sx-form-error">{error}</p> : null}

                  <button type="submit" className="sx-form-submit sx-call-submit" disabled={submitting}>
                    {submitting ? "Submitting…" : "Request call"}
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
