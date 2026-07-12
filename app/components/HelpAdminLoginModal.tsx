"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { appPath } from "@/lib/apiBase";
import { setAuthInStorage } from "@/lib/auth";
import { supportApi } from "@/lib/supportApi";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function HelpAdminLoginModal({ open, onClose }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !mounted) return null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await supportApi.helpAgentLogin({ name, email, password });
      setAuthInStorage(data.token, data.user);
      onClose();
      window.location.href = appPath("admin");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="jb-help-admin-modal__backdrop" onClick={onClose} role="presentation">
      <div
        className="jb-help-admin-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="jb-help-admin-title"
      >
        <h2 id="jb-help-admin-title">Help Admin</h2>
        <p className="jb-help-admin-modal__sub">
          Sign in with your name, email, and help desk password. Your email is saved so you receive alerts when new tickets are created.
        </p>
        <form onSubmit={onSubmit} className="jb-help-admin-modal__form">
          <label>
            <span>Name</span>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" autoComplete="name" />
          </label>
          <label>
            <span>Email</span>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" />
          </label>
          <label>
            <span>Password</span>
            <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Help desk password" autoComplete="current-password" />
          </label>
          {error ? <p className="jb-help-admin-modal__error">{error}</p> : null}
          <div className="jb-help-admin-modal__actions">
            <button type="button" className="jb-help-admin-modal__ghost" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="jb-help-admin-modal__primary" disabled={loading}>
              {loading ? "Signing in…" : "Open Help Admin"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
