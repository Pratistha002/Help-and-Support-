"use client";

import { useState } from "react";
import { IconAlertCircle, IconCheckCircle, IconLoader, IconPhone, IconPhoneOutgoing } from "./AdminIcons";

type Props = {
  onCallBack?: (phone: string) => Promise<void>;
  agentOnline?: boolean;
  callBackLoadingId?: string | null;
};

export function CallCustomerBackPanel({
  onCallBack,
  agentOnline = false,
  callBackLoadingId,
}: Props) {
  const [manualPhone, setManualPhone] = useState("");
  const loadingKey = `manual-${manualPhone.trim()}`;
  const isLoading = callBackLoadingId === loadingKey;

  const submitManualCall = async (e: React.FormEvent) => {
    e.preventDefault();
    const phone = manualPhone.trim();
    if (!phone || !onCallBack) return;
    await onCallBack(phone);
  };

  return (
    <section
      id="hs-call-callback"
      className="hs-call-dashboard__outbound hs-call-dashboard__outbound--sidebar"
      aria-labelledby="outbound-call-heading"
    >
      <div className="hs-call-dashboard__outbound-head">
        <div>
          <h3 id="outbound-call-heading">Call customer back</h3>
          <p className="hs-call-dashboard__outbound-sub">
            Go online on the softphone first, then dial a missed caller or enter any number.
          </p>
        </div>
        <span className={`hs-call-dashboard__outbound-status${agentOnline ? " is-online" : ""}`}>
          {agentOnline ? (
            <>
              <IconCheckCircle size={13} />
              Online
            </>
          ) : (
            <>
              <IconAlertCircle size={13} />
              Offline
            </>
          )}
        </span>
      </div>

      <form className="hs-call-dashboard__outbound-form" onSubmit={(e) => void submitManualCall(e)}>
        <div className="hs-call-dashboard__outbound-input-wrap">
          <IconPhone size={16} className="hs-call-dashboard__outbound-input-icon" />
          <input
            id="outbound-phone-input"
            type="tel"
            className="hs-call-dashboard__outbound-input"
            placeholder="Customer phone (+91…)"
            value={manualPhone}
            onChange={(e) => setManualPhone(e.target.value)}
            autoComplete="tel"
            aria-label="Customer phone number"
          />
        </div>
        <button
          type="submit"
          className="hs-call-dashboard__outbound-btn"
          disabled={!onCallBack || !agentOnline || isLoading}
          title={!agentOnline ? "Go online on the softphone first" : undefined}
        >
          {isLoading ? (
            <>
              <IconLoader size={15} />
              Dialing…
            </>
          ) : (
            <>
              <IconPhoneOutgoing size={15} />
              Call number
            </>
          )}
        </button>
      </form>
    </section>
  );
}
