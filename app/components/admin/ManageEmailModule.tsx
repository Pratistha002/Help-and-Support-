"use client";

import { SubmissionTicketsModule } from "./SubmissionTicketsModule";

type AgentUser = { id: string; email: string; fullName: string } | null;

export function ManageEmailModule({ agentUser }: { agentUser: AgentUser }) {
  return <SubmissionTicketsModule variant="email" agentUser={agentUser} />;
}
