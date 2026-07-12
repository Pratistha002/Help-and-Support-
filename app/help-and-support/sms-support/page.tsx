import { redirect } from "next/navigation";
import { appPath } from "@/lib/apiBase";

export default function SmsSupportPage() {
  redirect(appPath("/help-and-support"));
}
