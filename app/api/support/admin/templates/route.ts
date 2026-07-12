import { json } from "@/lib/server/http";
import { SUPPORT_EMAIL_TEMPLATES, SUPPORT_SMS_TEMPLATES } from "@/lib/supportTemplates";

export const dynamic = "force-dynamic";

export async function GET() {
  return json({
    email: SUPPORT_EMAIL_TEMPLATES.map(({ id, label, forStatus }) => ({ id, label, forStatus })),
    sms: SUPPORT_SMS_TEMPLATES.map(({ id, label, forStatus }) => ({ id, label, forStatus })),
  });
}
