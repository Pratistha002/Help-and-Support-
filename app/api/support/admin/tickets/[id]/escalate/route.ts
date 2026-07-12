import { NextRequest } from "next/server";
import { assignTechnicalEscalation } from "@/lib/server/store";
import { notifyTechnicalMemberAssigned } from "@/lib/server/notifyTechnicalMember";
import { json, errorResponse, requireAdmin } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin(req);
    const body = await req.json();
    const technicalMemberId = String(body.technicalMemberId || "").trim();
    if (!technicalMemberId) return errorResponse("technicalMemberId is required", 400);

    const { ticket, member } = await assignTechnicalEscalation(
      params.id,
      technicalMemberId,
      body.note ? String(body.note) : undefined,
      {
        id: admin.sub,
        name: admin.fullName || "Support Admin",
        email: admin.email || "",
      },
    );

    const notifications = await notifyTechnicalMemberAssigned(
      ticket,
      member,
      admin.fullName || "Support Admin",
    );

    return json({
      ticket,
      emailSent: notifications.emailSent,
      smsSent: notifications.smsSent,
      emailError: notifications.emailError,
      smsError: notifications.smsError,
      message: notifications.emailSent || notifications.smsSent
        ? "Ticket escalated and assignee notified."
        : "Ticket escalated. Notification delivery had issues — check email/SMS configuration.",
    });
  } catch (e: any) {
    const status = e?.message === "Login required" ? 401 : e?.message?.includes("Admin") ? 403 : 400;
    return errorResponse(e?.message || "Escalation failed", status);
  }
}
