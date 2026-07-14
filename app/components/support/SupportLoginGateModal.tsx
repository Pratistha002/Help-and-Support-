"use client";

import Link from "next/link";
import { appPath } from "@/lib/apiBase";
import { workforceLoginUrls } from "@/lib/requireSupportLogin";

type Props = {
  open: boolean;
  featureLabel: string;
  returnPath?: string;
  onClose: () => void;
  /** When true, mention Ask AI is still available without login. */
  suggestAi?: boolean;
};

export function SupportLoginGateModal({
  open,
  featureLabel,
  returnPath = "/help-and-support",
  onClose,
  suggestAi = true,
}: Props) {
  if (!open) return null;

  const logins = workforceLoginUrls(returnPath);

  return (
    <div className="sx-help-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="sx-login-gate-title">
      <div className="sx-help-modal sx-help-login-gate-modal">
        <h3 id="sx-login-gate-title">Sign in required</h3>
        <p>
          Please log in to your SaarthiWorkforce account to use <strong>{featureLabel}</strong>.
        </p>
        {suggestAi ? (
          <p className="sx-help-login-gate-modal__hint">
            You can still use <strong>Ask AI assistant</strong> without signing in.
          </p>
        ) : null}
        <div className="sx-help-login-gate-modal__actions">
          <a className="sx-help-login-gate-modal__primary" href={logins.employee}>
            Login as Employee
          </a>
          <a className="sx-help-login-gate-modal__secondary" href={logins.manager}>
            Login as Manager / HR
          </a>
          <button type="button" className="sx-help-login-gate-modal__cancel" onClick={onClose}>
            Cancel
          </button>
        </div>
        <p className="sx-help-login-gate-modal__footer">
          <Link href={appPath("/help-and-support")} onClick={onClose}>
            ← Back to Help &amp; Support
          </Link>
        </p>
      </div>
    </div>
  );
}
