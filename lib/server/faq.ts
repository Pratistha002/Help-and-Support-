import faqSeed from "@/data/support-faqs.json";

export type FaqItem = {
  _id: string;
  consumerType: string;
  category: string;
  question: string;
  answer: string;
  published?: boolean;
  viewCount?: number;
};

const faqs: FaqItem[] = (faqSeed as Omit<FaqItem, "_id">[]).map((f, i) => ({
  ...f,
  _id: `faq-${i + 1}`,
  published: true,
  viewCount: 0,
}));

export function listFaqs(consumerType?: string, search?: string): FaqItem[] {
  let items = faqs.filter((f) => f.published !== false);
  if (consumerType) items = items.filter((f) => f.consumerType === consumerType);
  if (search?.trim()) {
    const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    items = items.filter((f) => {
      const haystack = `${f.question} ${f.answer} ${f.category}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }
  return items;
}

const FAQ_STOP_WORDS = new Set([
  "what", "how", "can", "does", "when", "where", "why", "the", "and", "for", "with",
  "this", "that", "from", "have", "get", "not", "are", "was", "were", "you", "your",
  "any", "about", "should", "will", "could", "who", "which", "there", "their", "they",
]);

export function findBestFaqMatch(consumerType: string, message: string): FaqItem | null {
  const scored = findFaqMatchWithScore(consumerType, message);
  return scored && scored.score >= (scored.words.length <= 2 ? 5 : 4) ? scored.faq : null;
}

export function findFaqMatchWithScore(
  consumerType: string,
  message: string,
): { faq: FaqItem; score: number; words: string[] } | null {
  const lower = message.toLowerCase().trim();
  const words = lower.split(/\W+/).filter((w) => w.length > 2 && !FAQ_STOP_WORDS.has(w));
  if (words.length === 0) return null;

  let best: FaqItem | null = null;
  let bestScore = 0;
  for (const f of faqs.filter((x) => x.consumerType === consumerType)) {
    const qLower = f.question.toLowerCase();
    const aLower = f.answer.toLowerCase();
    let score = 0;
    if (qLower.includes(lower) || lower.includes(qLower.slice(0, Math.min(24, qLower.length)))) score += 10;
    for (const w of words) {
      if (qLower.includes(w)) score += 4;
      else if (aLower.includes(w)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = f;
    }
  }
  if (!best || bestScore === 0) return null;
  return { faq: best, score: bestScore, words };
}
