import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminDashboard } from "../components/admin/AdminDashboard";
import { HelpDeskNotificationsProvider } from "../contexts/HelpDeskNotificationsContext";

export const metadata: Metadata = {
  title: "Admin — Support Dashboard",
  description: "Live chat, email, form tickets, and status management.",
};

export default function AdminPage() {
  return (
    <HelpDeskNotificationsProvider>
      <Suspense fallback={<p className="sx-help-muted" style={{ padding: "2rem" }}>Loading…</p>}>
        <AdminDashboard />
      </Suspense>
    </HelpDeskNotificationsProvider>
  );
}
