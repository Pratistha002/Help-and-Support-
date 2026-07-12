import type { Metadata } from "next";
import { TrackTicketsClient } from "../../components/support/TrackTicketsClient";

export const metadata: Metadata = {
  title: "Track Ticket — Help & Support",
  description: "View your support tickets, check status, and close requests when resolved.",
};

export default function TrackTicketsPage() {
  return <TrackTicketsClient />;
}
