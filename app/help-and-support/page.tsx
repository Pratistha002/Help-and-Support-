import type { Metadata } from "next";
import { HelpSupportClient } from "../components/support/HelpSupportClient";

export const metadata: Metadata = {
  title: "Help and Support",
  description: "FAQs, AI chat, live agent, tickets, and email support.",
};

export default function HelpSupportRoute() {
  return <HelpSupportClient />;
}
