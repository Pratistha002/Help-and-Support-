import { NextRequest } from "next/server";
import { createCallbackRequest, findRecentPendingCallback } from "@/lib/server/store";
import { notifySupportInbox, sendCallbackAckToCustomer } from "@/lib/server/mail";
import { callbackReference } from "@/lib/callbackConstants";
import { callAckMessage, normalizeToE164, sendSms } from "@/lib/server/twilio";
import { isMailConfigured } from "@/lib/server/env";
import { json, errorResponse } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const callerName = String(body.callerName || body.name || "").trim();
    const phoneRaw = String(body.phone || "").trim();
    const email = String(body.email || body.callerEmail || "").trim().toLowerCase();
    const consumerType = body.consumerType || "EMPLOYEE";

    if (!callerName) return errorResponse("Please enter your name");
    const phone = normalizeToE164(phoneRaw);
    if (!phone) return errorResponse("Enter a valid phone number with country code (e.g. +919876543210)");

    const recent = await findRecentPendingCallback(phone);
    if (recent) {
      const ref = callbackReference(String(recent._id));
      return json({
        success: true,
        mode: "callback",
        callbackRequestId: String(recent._id),
        callbackReference: ref,
        queuePosition: recent.queuePosition,
        customerPhone: phone,
        deduplicated: true,
        message: "You already have a callback request in queue. Our team will call you shortly.",
      });
    }

    const callback = await createCallbackRequest({
      phone,
      callerName,
      callerEmail: email || undefined,
      consumerType,
    });

    const ref = callbackReference(String(callback._id));

    const sms = await sendSms(phone, callAckMessage());
    if (isMailConfigured() && email) {
      await sendCallbackAckToCustomer({
        to: email,
        name: callerName,
        callbackReference: ref,
        queuePosition: callback.queuePosition,
      });
    }
    await notifySupportInbox({
      ticketNumber: ref,
      channel: "Call callback",
      name: callerName,
      email: email || undefined,
      phone,
      subject: "Callback request (Call Management)",
      message: `Customer requested a phone callback to ${phone}. Queue position: ${callback.queuePosition}. Appears in admin Call Management — no ticket until agent creates one.`,
      isTicket: false,
    });

    try {
      const { notifyAdminCallbackRequest } = await import("@/lib/server/adminNotifications");
      await notifyAdminCallbackRequest(callback);
    } catch {
      /* non-blocking */
    }

    return json({
      success: true,
      mode: "callback",
      callbackRequestId: String(callback._id),
      callbackReference: ref,
      queuePosition: callback.queuePosition,
      customerPhone: phone,
      smsSent: sms.ok,
      message: "Callback request received. Our team will call you back shortly.",
    });
  } catch (e: any) {
    return errorResponse(e?.message || "Could not submit call request", 500);
  }
}
