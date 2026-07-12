export type PersistedChatState = {
  messages: Array<{ role: "user" | "assistant"; content: string; meta?: unknown }>;
  sessionId: string | null;
  flowPhase: "role" | "general" | "platform" | "chat";
  selectedService: string | null;
  chatMode: "ai" | "agent";
  aiExchangeCount: number;
  agentOfferDismissed: boolean;
  consumerType: string;
};

const STORAGE_KEY = "hs_help_ai_chat_v1";

export function loadChatState(): PersistedChatState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return null;
    const rawPhase = String(parsed.flowPhase || "general");
    const flowPhase =
      rawPhase === "chat"
        ? "chat"
        : rawPhase === "role"
          ? "role"
          : rawPhase === "platform" || rawPhase === "services"
            ? "platform"
            : "general";
    return { ...parsed, flowPhase } as PersistedChatState;
  } catch {
    return null;
  }
}

export function saveChatState(state: PersistedChatState): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota or private mode */
  }
}

export function clearChatState(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}
