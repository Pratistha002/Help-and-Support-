"use client";

import { useEffect, useRef } from "react";
import { readWorkforceSsoFromUrl, stripWorkforceSsoFromUrl, syncWorkforceAuthToHelp } from "@/lib/workforceSync";

/**
 * When the user opens Help & Support from Employeemanage (port 3002), TalentX appends
 * ?token=&email=&name=&userType= once. We exchange that org JWT for a Help session here.
 * Only strips SSO params after a successful sync so a failed attempt can be retried.
 */
export function WorkforceAuthBridge() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || typeof window === "undefined") return;
    ran.current = true;

    void (async () => {
      const fromUrl = readWorkforceSsoFromUrl();
      if (fromUrl) {
        const ok = await syncWorkforceAuthToHelp(fromUrl);
        if (ok) {
          stripWorkforceSsoFromUrl();
          return;
        }
        // Retry once — cold API / race with first paint.
        await new Promise((r) => setTimeout(r, 400));
        const retryOk = await syncWorkforceAuthToHelp(fromUrl);
        if (retryOk) stripWorkforceSsoFromUrl();
        return;
      }

      // Same-origin revisit: ensure Help JWT exists if org session was stored earlier.
      await syncWorkforceAuthToHelp();
    })();
  }, []);

  return null;
}
