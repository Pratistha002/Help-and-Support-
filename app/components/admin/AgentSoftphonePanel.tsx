"use client";

import { type RefObject, useEffect, useMemo, useState } from "react";
import {
  AdminSoftphone,
  type AdminSoftphoneHandle,
  type SoftphoneState,
} from "./AdminSoftphone";
import {
  IconAlertCircle,
  IconCheckCircle,
  IconClock,
  IconHeadphones,
  IconLoader,
  IconMic,
  IconMicOff,
  IconPhone,
  IconPhoneOff,
  IconUser,
  IconVolume,
} from "./AdminIcons";
import "./support-softphone.css";

type PanelState = "offline" | "connecting" | "ready" | "onCall" | "error";

function mapPanelState(online: boolean, state: SoftphoneState): PanelState {
  if (!online && state === "offline") return "offline";
  if (state === "error") return "error";
  if (state === "live" || state === "ringing") return "onCall";
  if (state === "ready") return "ready";
  if (state === "registering" || state === "connecting") return "connecting";
  return online ? "connecting" : "offline";
}

const STATE_PILL: Record<PanelState, string> = {
  offline: "Offline",
  connecting: "Connecting…",
  ready: "Ready",
  onCall: "On call",
  error: "Error",
};

type Props = {
  online: boolean;
  onOnlineChange: (online: boolean) => void;
  softphoneConfigured: boolean;
  usePhoneFallback: boolean;
  onUsePhoneFallbackChange: (value: boolean) => void;
  adminPhone: string;
  onAdminPhoneChange: (value: string) => void;
  softphoneRef: RefObject<AdminSoftphoneHandle | null>;
  softphoneState: SoftphoneState;
  onSoftphoneStatus: (message: string) => void;
  onSoftphoneStateChange: (state: SoftphoneState) => void;
  onCallEnded: () => void;
  activeCallerLabel?: string;
  errorMessage?: string;
  showAdvanced?: boolean;
  onToggleAdvanced?: () => void;
  callStatusWebhook?: string | null;
};

export function AgentSoftphonePanel({
  online,
  onOnlineChange,
  softphoneConfigured,
  usePhoneFallback,
  onUsePhoneFallbackChange,
  adminPhone,
  onAdminPhoneChange,
  softphoneRef,
  softphoneState,
  onSoftphoneStatus,
  onSoftphoneStateChange,
  onCallEnded,
  activeCallerLabel,
  errorMessage = "",
  showAdvanced,
  onToggleAdvanced,
  callStatusWebhook,
}: Props) {
  const [micAllowed, setMicAllowed] = useState<boolean | null>(null);
  const [muted, setMuted] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);

  const panelState = mapPanelState(online, softphoneState);
  const isConnecting = panelState === "connecting";
  const onCall = panelState === "onCall";

  useEffect(() => {
    if (!onCall) {
      setCallSeconds(0);
      return undefined;
    }
    const id = window.setInterval(() => setCallSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [onCall]);

  useEffect(() => {
    setMuted(softphoneRef.current?.isMuted() ?? false);
  }, [softphoneState, softphoneRef]);

  const elapsed = useMemo(() => {
    const m = Math.floor(callSeconds / 60).toString().padStart(2, "0");
    const s = (callSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [callSeconds]);

  const requestMic = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMicAllowed(false);
        return false;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicAllowed(true);
      return true;
    } catch {
      setMicAllowed(false);
      return false;
    }
  };

  const toggleOnline = async () => {
    if (online) {
      onOnlineChange(false);
      return;
    }
    await requestMic();
    onOnlineChange(true);
  };

  const toggleMute = () => {
    softphoneRef.current?.toggleMute();
    setMuted(softphoneRef.current?.isMuted() ?? false);
  };

  const hangUp = () => {
    softphoneRef.current?.hangUp();
    setMuted(false);
  };

  return (
    <div className="hs-softphone">
      <div className={`hs-softphone__panel hs-softphone__panel--${panelState}`}>
        <div className="hs-softphone__header">
          <div className="hs-softphone__header-main">
            <div className="hs-softphone__header-icon">
              <IconHeadphones size={20} />
            </div>
            <div className="hs-softphone__header-text">
              <h3>Agent Softphone</h3>
              <p>Browser-based call handling · Twilio Voice SDK</p>
            </div>
          </div>
          <div className={`hs-softphone__state-pill hs-softphone__state-pill--${panelState}`}>
            {isConnecting && <IconLoader size={12} />}
            {panelState === "ready" && <IconCheckCircle size={12} />}
            {panelState === "onCall" && <IconPhone size={12} />}
            {panelState === "error" && <IconAlertCircle size={12} />}
            <span>{STATE_PILL[panelState]}</span>
          </div>
          {panelState === "offline" && !online && (
            <p className="hs-softphone__state-hint">Click Go Online below to receive calls.</p>
          )}
        </div>

        {micAllowed === false && (
          <div className="hs-softphone__alert hs-softphone__alert--warn">
            <IconAlertCircle size={15} />
            Microphone access blocked — allow it in browser settings for call audio.
          </div>
        )}

        {!softphoneConfigured && (
          <div className="hs-softphone__alert hs-softphone__alert--warn">
            <IconAlertCircle size={15} />
            Voice token not configured. Set TWILIO_API_KEY and TWILIO_API_SECRET in .env and restart the app.
          </div>
        )}

        {errorMessage && panelState === "error" && (
          <div className="hs-softphone__alert hs-softphone__alert--error">
            <IconAlertCircle size={15} />
            {errorMessage}
            <button type="button" className="hs-softphone__retry-btn" onClick={() => onOnlineChange(true)}>
              Reconnect softphone
            </button>
          </div>
        )}

        {onCall && (
          <div className="hs-softphone__active-call">
            <div className="hs-softphone__active-call-main">
              <div className="hs-softphone__active-call-avatar"><IconUser size={20} /></div>
              <div className="hs-softphone__active-call-details">
                <div className="hs-softphone__active-call-top">
                  <p className="hs-softphone__active-call-name" title={activeCallerLabel}>
                    {activeCallerLabel || "Customer call"}
                  </p>
                  <div className="hs-softphone__active-call-live">
                    <span className="hs-softphone__live-dot" /> LIVE
                  </div>
                </div>
                <p className="hs-softphone__active-call-timer">
                  <IconClock size={12} /> {elapsed}
                </p>
              </div>
            </div>
            <div className="hs-softphone__active-call-controls">
              <button
                type="button"
                className={`hs-softphone__ctrl-btn${muted ? " hs-softphone__ctrl-btn--active" : ""}`}
                onClick={toggleMute}
                disabled={softphoneState !== "live"}
              >
                {muted ? <IconMicOff size={18} /> : <IconMic size={18} />}
                <span>{muted ? "Unmute" : "Mute"}</span>
              </button>
              <button type="button" className="hs-softphone__ctrl-btn hs-softphone__ctrl-btn--hangup" onClick={hangUp}>
                <IconPhoneOff size={18} />
                <span>Hang up</span>
              </button>
            </div>
          </div>
        )}

        {!onCall && (
          <div className="hs-softphone__footer">
            {micAllowed === null && !online && (
              <p className="hs-softphone__hint">
                <IconVolume size={13} />
                Browser will ask for microphone permission when you go online.
              </p>
            )}
            <button
              type="button"
              className={`hs-softphone__toggle-btn${online ? " hs-softphone__toggle-btn--danger" : " hs-softphone__toggle-btn--primary"}`}
              onClick={() => void toggleOnline()}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <><IconLoader size={16} /> Connecting…</>
              ) : online ? (
                <><IconPhoneOff size={16} /> Go offline</>
              ) : (
                <><IconPhone size={16} /> Go online &amp; receive calls</>
              )}
            </button>
          </div>
        )}

        {onToggleAdvanced ? (
          <div className="hs-softphone__footer" style={{ borderTop: "1px solid #e2e8f0", paddingTop: "0.75rem" }}>
            <button type="button" className="hs-btn hs-btn--ghost" onClick={onToggleAdvanced} style={{ width: "100%" }}>
              {showAdvanced ? "Hide advanced options" : "Advanced options"}
            </button>
            {showAdvanced ? (
              <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {softphoneConfigured ? (
                  <label className="admin-online-toggle admin-online-toggle--compact">
                    <input
                      type="checkbox"
                      checked={usePhoneFallback}
                      onChange={(e) => onUsePhoneFallbackChange(e.target.checked)}
                    />
                    <span>Use my phone instead of browser softphone</span>
                  </label>
                ) : null}
                {(!softphoneConfigured || usePhoneFallback) ? (
                  <input
                    type="tel"
                    placeholder="Your phone for callbacks"
                    value={adminPhone}
                    onChange={(e) => onAdminPhoneChange(e.target.value)}
                    disabled={!online}
                    className="admin-search-input"
                  />
                ) : null}
                {callStatusWebhook ? (
                  <div className="admin-webhook-box">
                    <p><b>Call status webhook</b></p>
                    <code className="admin-webhook-url">{callStatusWebhook}</code>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {softphoneConfigured && !usePhoneFallback ? (
        <AdminSoftphone
          ref={softphoneRef as RefObject<AdminSoftphoneHandle>}
          headless
          online={online}
          enabled={!usePhoneFallback}
          onStatus={onSoftphoneStatus}
          onStateChange={onSoftphoneStateChange}
          onCallEnded={onCallEnded}
        />
      ) : null}
    </div>
  );
}
