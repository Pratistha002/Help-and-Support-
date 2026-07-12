import { getQuickTopicsForRole } from "./aiGuides";
import { getGenericFaqChips, type FaqChip } from "./faqTopics";

export type ChatSuggestionChip = {
  id: string;
  label: string;
  kind: "topic" | "query-not-listed" | "back-to-menu";
  prompt?: string;
};

const MAX_TOPIC_SUGGESTIONS = 3;

function normalizeKey(text: string) {
  return text.trim().toLowerCase();
}

function topicFromFaq(f: FaqChip) {
  return { id: f.id, label: f.question, prompt: f.question };
}

/** Build 3 topic chips + query-not-listed + back-to-menu for the chat footer. */
export function buildChatSuggestionChips(opts: {
  consumerType: string;
  serviceFaqChips: FaqChip[];
  askedMessages: string[];
}): ChatSuggestionChip[] {
  const asked = new Set(opts.askedMessages.map(normalizeKey));
  const quickTopics = getQuickTopicsForRole(opts.consumerType);

  const pool: { id: string; label: string; prompt: string }[] = [];
  const seen = new Set<string>();

  const add = (items: { id: string; label: string; prompt: string }[]) => {
    for (const item of items) {
      const key = normalizeKey(item.prompt || item.label);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      pool.push(item);
    }
  };

  add(opts.serviceFaqChips.map(topicFromFaq));
  add(quickTopics.map((t) => ({ id: t.id, label: t.label, prompt: t.prompt })));
  add(getGenericFaqChips(opts.consumerType, 8).map(topicFromFaq));

  const topics = pool
    .filter((t) => !asked.has(normalizeKey(t.prompt)) && !asked.has(normalizeKey(t.label)))
    .slice(0, MAX_TOPIC_SUGGESTIONS)
    .map((t) => ({
      id: t.id,
      label: t.label.length > 52 ? `${t.label.slice(0, 50)}…` : t.label,
      kind: "topic" as const,
      prompt: t.prompt,
    }));

  const actions: ChatSuggestionChip[] = [
    { id: "query-not-listed", label: "Query not listed", kind: "query-not-listed" },
    { id: "back-to-menu", label: "Back to menu", kind: "back-to-menu" },
  ];

  return [...topics, ...actions];
}
