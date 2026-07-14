"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { appPath } from "@/lib/apiBase";
import { workforceLoginUrls } from "@/lib/requireSupportLogin";
import { resolveSupportAuth, type SupportAuth } from "@/lib/resolveSupportAuth";
import { syncWorkforceAuthFromPage } from "@/lib/workforceSync";
import { getAuthFromStorage } from "@/lib/auth";

type Props = {
  featureLabel: string;
  returnPath: string;
  children: (auth: SupportAuth) => ReactNode;
};

/**
 * Blocks email / call support forms until the user has a SaarthiWorkforce session.
 * Guests see a login prompt instead of the form.
 */
export function SupportAuthGuard({ featureLabel, returnPath, children }: Props) {
  const [ready, setReady] = useState(false);
  const [auth, setAuth] = useState<SupportAuth>({ token: "", user: null, source: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await syncWorkforceAuthFromPage().catch(() => false);
      if (cancelled) return;
      const hs = getAuthFromStorage();
      if (hs.token && hs.user) {
        setAuth({ token: hs.token, user: hs.user, source: "hs" });
      } else {
        setAuth(resolveSupportAuth());
      }
      setReady(true);
    })();
    const sync = () => {
      const hs = getAuthFromStorage();
      if (hs.token && hs.user) setAuth({ token: hs.token, user: hs.user, source: "hs" });
      else setAuth(resolveSupportAuth());
    };
    window.addEventListener("hs-auth-changed", sync);
    window.addEventListener("jbv2-org-auth-changed", sync);
    window.addEventListener("workforce-help-sync-done", sync);
    return () => {
      cancelled = true;
      window.removeEventListener("hs-auth-changed", sync);
      window.removeEventListener("jbv2-org-auth-changed", sync);
      window.removeEventListener("workforce-help-sync-done", sync);
    };
  }, []);

  if (!ready) {
    return (
      <div className="sx-help-page">
        <div className="sx-help-layout">
          <p className="sx-help-muted">Checking sign-in…</p>
        </div>
      </div>
    );
  }

  // Prefer Help & Support JWT (needed for API); org-only without sync still needs login.
  const hsReady = Boolean(auth.source === "hs" && auth.token && auth.user);
  if (!hsReady) {
    const logins = workforceLoginUrls(returnPath);
    return (
      <div className="sx-help-page">
        <div className="sx-help-layout">
          <Link href={appPath("/help-and-support")} className="sx-form-back">
            ← Help &amp; Support
          </Link>
          <div className="sx-help-login-required-card">
            <h1>Sign in required</h1>
            <p>
              Please log in to your SaarthiWorkforce account to use <strong>{featureLabel}</strong>.
            </p>
            <p className="sx-help-login-required-card__hint">
              FAQs and <strong>Ask AI assistant</strong> are available without signing in.
            </p>
            <div className="sx-help-login-required-card__actions">
              <a className="sx-help-login-gate-modal__primary" href={logins.employee}>
                Login as Employee
              </a>
              <a className="sx-help-login-gate-modal__secondary" href={logins.manager}>
                Login as Manager / HR
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children(auth)}</>;
}
