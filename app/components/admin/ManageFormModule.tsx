"use client";

import { SubmissionTicketsModule } from "./SubmissionTicketsModule";

type AgentUser = { id: string; email: string; fullName: string } | null;

export function ManageFormModule({ agentUser }: { agentUser: AgentUser }) {
  return <SubmissionTicketsModule variant="agent-raised" agentUser={agentUser} />;
}
