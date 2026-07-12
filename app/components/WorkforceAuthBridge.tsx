"use client";

import { useEffect, useRef } from "react";
import { readWorkforceSsoFromUrl, stripWorkforceSsoFromUrl, syncWorkforceAuthToHelp } from "@/lib/workforceSync";

/**
 * When the user opens Help & Support from Employeemanage (port 3002), TalentX appends
 * ?token=&email=&name=&userType= once. We exchange that org JWT for a Help session here.
 */
export function WorkforceAuthBridge() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || typeof window === "undefined") return;

    const fromUrl = readWorkforceSsoFromUrl();
    if (fromUrl) {
      ran.current = true;
      void (async () => {
        try {
          await syncWorkforceAuthToHelp(fromUrl);
        } finally {
          stripWorkforceSsoFromUrl();
        }
      })();
      return;
    }

    // Already visited with SSO — ensure Help JWT exists if org session was stored earlier.
    ran.current = true;
    void syncWorkforceAuthToHelp();
  }, []);

  return null;
}
