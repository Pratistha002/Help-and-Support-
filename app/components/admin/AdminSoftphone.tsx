"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { Call, Device } from "@twilio/voice-sdk";
import { supportApi } from "@/lib/supportApi";

export type SoftphoneState = "offline" | "registering" | "ready" | "connecting" | "ringing" | "live" | "error";

export type AdminSoftphoneHandle = {
  placeCall: (callbackId: string, customerPhone: string) => Promise<void>;
  hangUp: () => void;
  toggleMute: () => void;
  isMuted: () => boolean;
  isReady: () => boolean;
  getState: () => SoftphoneState;
};

type Props = {
  online: boolean;
  enabled: boolean;
  compact?: boolean;
  headless?: boolean;
  onStatus: (message: string) => void;
  onStateChange?: (state: SoftphoneState) => void;
  onCallEnded?: () => void;
};

function stateLabel(state: SoftphoneState): string {
  switch (state) {
    case "offline":
      return "Softphone offline";
    case "registering":
      return "Connecting softphone… allow microphone when prompted";
    case "ready":
      return "Softphone ready — use headset & allow microphone";
    case "connecting":
      return "Dialing customer phone…";
    case "ringing":
      return "Customer phone ringing — browser connects when they answer";
    case "live":
      return "Live call — speak with the customer";
    case "error":
      return "Softphone error — click Retry below";
    default:
      return "";
  }
}

async function ensureMicrophoneAccess(): Promise<void> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone is not supported in this browser");
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach((track) => track.stop());
}

async function configureSpeakerOutput(device: Device): Promise<void> {
  try {
    const audio = device.audio;
    if (!audio?.speakerDevices?.get || !audio.speakerDevices.set) return;
    const available = await audio.speakerDevices.get();
    const first = available ? Array.from(available.values())[0] : undefined;
    const deviceId = first && "deviceId" in first ? String(first.deviceId) : "";
    if (deviceId) {
      await audio.speakerDevices.set(deviceId);
    }
  } catch {
    /* Browser uses system default output */
  }
}

function waitForRegistered(device: Device, TwilioDevice: typeof Device, timeoutMs = 25000): Promise<void> {
  if (device.state === TwilioDevice.State.Registered) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("Softphone registration timed out — check network/firewall and retry"));
    }, timeoutMs);
    const onRegistered = () => {
      cleanup();
      resolve();
    };
    const onError = (e: { message?: string }) => {
      cleanup();
      reject(new Error(e?.message || "Softphone registration failed"));
    };
    const cleanup = () => {
      window.clearTimeout(timer);
      device.off("registered", onRegistered);
      device.off("error", onError);
    };
    device.on("registered", onRegistered);
    device.on("error", onError);
  });
}

export const AdminSoftphone = forwardRef<AdminSoftphoneHandle, Props>(function AdminSoftphone(
  { online, enabled, compact = false, headless = false, onStatus, onStateChange, onCallEnded },
  ref,
) {
  const deviceRef = useRef<Device | null>(null);
  const callRef = useRef<Call | null>(null);
  const identityRef = useRef<string>("");
  const callbackIdRef = useRef<string>("");
  const stateRef = useRef<SoftphoneState>("offline");
  const onStatusRef = useRef(onStatus);
  const onCallEndedRef = useRef(onCallEnded);
  const [state, setState] = useState<SoftphoneState>("offline");
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  onStatusRef.current = onStatus;
  onCallEndedRef.current = onCallEnded;

  const setPhoneState = useCallback((next: SoftphoneState) => {
    stateRef.current = next;
    setState(next);
    onStateChange?.(next);
  }, [onStateChange]);

  const wireCall = useCallback((call: Call, callbackId: string) => {
    callRef.current = call;

    call.on("accept", () => {
      setPhoneState("live");
      onStatusRef.current("Customer answered — you are live. Start the conversation.");
      void supportApi.adminCallbackCallEvent({
        callbackId,
        event: "connected",
        callSid: call.parameters?.CallSid,
      });
    });

    call.on("disconnect", () => {
      callRef.current = null;
      setMuted(false);
      setPhoneState("ready");
      onStatusRef.current("Call ended.");
      void supportApi.adminCallbackCallEvent({
        callbackId: callbackIdRef.current || callbackId,
        event: "disconnected",
        callSid: call.parameters?.CallSid,
      });
      onCallEndedRef.current?.();
    });

    call.on("cancel", () => {
      callRef.current = null;
      setMuted(false);
      setPhoneState("ready");
      onStatusRef.current("Call cancelled — customer did not answer or line busy.");
      void supportApi.adminCallbackCallEvent({ callbackId, event: "failed" });
      onCallEndedRef.current?.();
    });

    call.on("error", (e) => {
      callRef.current = null;
      setMuted(false);
      setPhoneState("ready");
      onStatusRef.current(e?.message || "Call failed");
      void supportApi.adminCallbackCallEvent({ callbackId, event: "failed" });
      onCallEndedRef.current?.();
    });
  }, [setPhoneState]);

  const wireCallRef = useRef(wireCall);
  wireCallRef.current = wireCall;

  const destroyDevice = useCallback(async () => {
    callRef.current?.disconnect();
    callRef.current = null;
    if (deviceRef.current) {
      try {
        deviceRef.current.destroy();
      } catch {
        /* ignore */
      }
      deviceRef.current = null;
    }
    identityRef.current = "";
    setMuted(false);
    setPhoneState("offline");
  }, [setPhoneState]);

  useEffect(() => {
    if (!online || !enabled) {
      void destroyDevice();
      return;
    }

    let cancelled = false;
    setError("");
    setPhoneState("registering");

    (async () => {
      try {
        await ensureMicrophoneAccess();
        if (cancelled) return;

        const { Device: TwilioDevice } = await import("@twilio/voice-sdk");
        const tokenRes = await supportApi.adminVoiceToken();
        if (cancelled) return;

        identityRef.current = tokenRes.identity;

        const device = new TwilioDevice(tokenRes.token, {
          closeProtection: true,
          logLevel: "error",
          edge: ["singapore", "roaming"],
        });

        device.on("unregistered", () => {
          if (!cancelled) setPhoneState("offline");
        });
        device.on("incoming", (call) => {
          const callbackId = callbackIdRef.current;
          if (!callbackId) {
            call.reject();
            return;
          }
          onStatusRef.current("Customer answered — connecting your browser…");
          wireCallRef.current(call, callbackId);
          call.accept();
        });

        await configureSpeakerOutput(device);
        if (cancelled) {
          device.destroy();
          return;
        }

        await device.register();
        await waitForRegistered(device, TwilioDevice);

        if (cancelled) {
          device.destroy();
          return;
        }

        deviceRef.current = device;
        setPhoneState("ready");
        onStatusRef.current("Softphone ready — select a callback and click Call back.");
      } catch (e: any) {
        if (cancelled) return;
        const msg =
          e?.name === "NotAllowedError"
            ? "Microphone blocked — allow mic access in the browser address bar, then click Retry."
            : e?.message || "Could not start softphone";
        setError(msg);
        setPhoneState("error");
        onStatusRef.current(msg);
      }
    })();

    return () => {
      cancelled = true;
      void destroyDevice();
    };
  }, [online, enabled, retryKey, destroyDevice, setPhoneState]);

  const hangUp = useCallback(() => {
    callRef.current?.disconnect();
    callRef.current = null;
    setMuted(false);
    if (online && enabled) setPhoneState("ready");
    else setPhoneState("offline");
  }, [online, enabled, setPhoneState]);

  const placeCall = useCallback(
    async (callbackId: string, customerPhone: string) => {
      if (!deviceRef.current || !identityRef.current) {
        throw new Error("Softphone is not ready — go online and allow microphone access");
      }
      if (stateRef.current !== "ready") {
        throw new Error("Wait until softphone shows Ready before calling");
      }

      callbackIdRef.current = callbackId;
      setPhoneState("connecting");
      onStatusRef.current(`Dialing ${customerPhone}…`);
      await supportApi.adminCallbackCallEvent({ callbackId, event: "connecting" }).catch(() => null);

      const r = await supportApi.adminSoftphoneCall(callbackId, identityRef.current, true);
      setPhoneState("ringing");
      onStatusRef.current(r.message || "Customer phone is ringing. You will hear them when they answer.");
    },
    [setPhoneState],
  );

  const toggleMute = useCallback(() => {
    const call = callRef.current;
    if (!call) return;
    const next = !muted;
    call.mute(next);
    setMuted(next);
  }, [muted]);

  useImperativeHandle(ref, () => ({
    placeCall,
    hangUp,
    toggleMute,
    isMuted: () => muted,
    isReady: () => stateRef.current === "ready" && Boolean(deviceRef.current) && Boolean(identityRef.current),
    getState: () => stateRef.current,
  }), [placeCall, hangUp, toggleMute, muted]);

  if (headless) return null;

  if (!enabled) return null;

  if (compact) {
    return (
      <div className={`admin-softphone admin-softphone--compact admin-softphone--${state}`} title={stateLabel(state)}>
        <span className={`admin-softphone-dot admin-softphone-dot--${state}`} aria-hidden />
        <span className="admin-softphone-compact-label">
          {state === "ready" ? "Softphone ready" : state === "live" ? "On call" : stateLabel(state)}
        </span>
        {error ? <span className="admin-softphone-error">{error}</span> : null}
        {state === "error" ? (
          <button type="button" className="admin-btn-sm" onClick={() => setRetryKey((k) => k + 1)}>
            Retry
          </button>
        ) : null}
        {state === "live" || state === "ringing" || state === "connecting" ? (
          <div className="admin-softphone-controls admin-softphone-controls--inline">
            <button type="button" className="admin-btn-sm" onClick={toggleMute} disabled={state !== "live"}>
              {muted ? "Unmute" : "Mute"}
            </button>
            <button type="button" className="admin-btn-sm admin-softphone-hangup" onClick={hangUp}>
              Hang up
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`admin-softphone admin-softphone--${state}`}>
      <div className="admin-softphone-header">
        <span className={`admin-softphone-dot admin-softphone-dot--${state}`} aria-hidden />
        <div>
          <strong>Browser softphone</strong>
          <p className="admin-hint">{stateLabel(state)}</p>
        </div>
      </div>

      {error ? <p className="admin-softphone-error">{error}</p> : null}

      {state === "error" ? (
        <button type="button" className="admin-btn-sm" onClick={() => setRetryKey((k) => k + 1)}>
          Retry softphone
        </button>
      ) : null}

      {state === "live" || state === "ringing" || state === "connecting" ? (
        <div className="admin-softphone-controls">
          <button type="button" className="admin-btn-sm" onClick={toggleMute} disabled={state !== "live"}>
            {muted ? "Unmute" : "Mute"}
          </button>
          <button type="button" className="admin-btn-sm admin-softphone-hangup" onClick={hangUp}>
            Hang up
          </button>
        </div>
      ) : null}

      <p className="admin-hint">
        Twilio calls the customer&apos;s mobile directly. Your browser connects when they pick up.
      </p>
    </div>
  );
});
