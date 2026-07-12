import { randomUUID } from "crypto";
import { findGuideMatch, isIrrelevantOrUnhelpfulReply, shouldOfferLiveAgent } from "../aiGuides";
import { findBestFaqMatch, findFaqMatchWithScore, listFaqs } from "./faq";

function wantsLiveAgent(message: string): boolean {
  const lower = message.toLowerCase().trim();
  return (
    /\b(live agent|live support|talk to agent|human agent|connect.*agent|live chat)\b/.test(lower) ||
    (/\b(agent|human)\b/.test(lower) && /\b(chat|talk|connect|want|need)\b/.test(lower))
  );
}

const SUPPORT_TOPIC =
  /\b(login|log ?in|sign ?in|password|refund|report|talentx|interview|skill|test|invite|profile|account|access|dashboard|employee|manager|payment|billing|ticket|support|help|error|issue|problem|working|download|certificate|analytics|progress|role|prep|assessment|quiz|blank|page|load|email|otp|hr|admin|bulk|excel|upload|money|charge|notification|recommend|engagement|department|docker|deploy|api|interviewx)\b/i;

const OFF_TOPIC =
  /\b(weather|joke|recipe|football|cricket|movie|song|poem|bitcoin|crypto|dating|politics|election|stock market|horoscope|tell me a story|write code for|homework help)\b/i;

const GREETING =
  /^(hi|hello|hey|good\s*(morning|afternoon|evening)|thanks|thank you|ok|okay|bye|goodbye)[!.?\s]*$/i;

export function isSupportRelatedMessage(message: string): boolean {
  return SUPPORT_TOPIC.test(message);
}

function isIrrelevantUserMessage(message: string): boolean {
  const text = message.trim();
  if (!text) return true;
  if (wantsLiveAgent(text) || GREETING.test(text)) return false;
  if (isSupportRelatedMessage(text)) return false;
  if (OFF_TOPIC.test(text)) return true;
  if (text.length < 3) return true;
  // No support keywords in a longer message — treat as off-topic
  return !SUPPORT_TOPIC.test(text);
}

const IRRELEVANT_REPLY =
  "Sorry, I didn't quite understand that. I can only help with **SaarthiWorkforce** and **TalentX** support — like login, role prep, skill tests, or dashboards.";

const NO_MATCH_REPLY =
  "I'm sorry, I don't have an answer for that in our help library.";

const GREETING_REPLY = (role: string) =>
  `Hello! I'm **SaarthiWorkforce AI**, your support assistant for **${role}** users.

Pick one of the **service topics** above, choose a **common question**, or type what you need help with — I'll answer from our help library and guide you step by step.`;

function formatProfessionalReply(text: string, opts?: { heading?: string }): string {
  let reply = sanitizeFaqForCustomer(text);
  if (opts?.heading && !reply.toLowerCase().includes(opts.heading.toLowerCase().slice(0, 12))) {
    reply = `**${opts.heading}**\n\n${reply}`;
  }
  return reply;
}

export async function aiChat(payload: {
  message: string;
  consumerType?: string;
  sessionId?: string;
  history?: Array<{ role: string; content: string }>;
  serviceLabel?: string;
}) {
  const consumerType = payload.consumerType || "EMPLOYEE";
  const sessionId = payload.sessionId || randomUUID();
  const userMessage = (payload.message || "").trim();

  if (!userMessage) {
    return {
      reply: "Choose a topic above or type your question — I'll answer from our help library.",
      sessionId,
      showConnectAgent: false,
      matchedFromDb: false,
      matchedFromGuide: false,
    };
  }

  if (wantsLiveAgent(userMessage)) {
    return {
      reply: "I'll connect you with a live support agent — click **Yes, connect me** below.",
      sessionId,
      showConnectAgent: true,
      matchedFromDb: false,
      matchedFromGuide: false,
      intent: "live_agent_handoff",
    };
  }

  if (GREETING.test(userMessage)) {
    return {
      reply: GREETING_REPLY(consumerType),
      sessionId,
      showConnectAgent: false,
      matchedFromDb: false,
      matchedFromGuide: false,
      intent: "greeting",
    };
  }

  if (isIrrelevantUserMessage(userMessage)) {
    return {
      reply: IRRELEVANT_REPLY,
      sessionId,
      showConnectAgent: true,
      matchedFromDb: false,
      matchedFromGuide: false,
      intent: "irrelevant",
    };
  }

  const guideMatch = findGuideMatch(consumerType, userMessage);
  if (guideMatch) {
    return {
      reply: formatProfessionalReply(guideMatch.answer, { heading: guideMatch.label }),
      sessionId,
      showConnectAgent: false,
      matchedFromDb: false,
      matchedFromGuide: true,
      suggestedCategory: guideMatch.label,
      guideId: guideMatch.id,
    };
  }

  const faqScored = findFaqMatchWithScore(consumerType, userMessage);
  const faqHighConfidence = faqScored && faqScored.score >= 8;
  const faqMediumConfidence = faqScored && faqScored.score >= 4;

  if (faqHighConfidence && faqScored) {
    return {
      reply: formatProfessionalReply(faqScored.faq.answer, {
        heading: faqScored.faq.question,
      }),
      sessionId,
      showConnectAgent: false,
      matchedFromDb: true,
      matchedFromGuide: false,
      suggestedCategory: faqScored.faq.category,
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey && (isSupportRelatedMessage(userMessage) || faqMediumConfidence)) {
    const roleFaqs = listFaqs(consumerType);
    const faqContext = roleFaqs
      .slice(0, 16)
      .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
      .join("\n\n");
    const bestFaq = faqMediumConfidence && faqScored ? faqScored.faq : findBestFaqMatch(consumerType, userMessage);
    const focusBlock = bestFaq
      ? `\nMost relevant FAQ entry:\nQ: ${bestFaq.question}\nA: ${bestFaq.answer}\n`
      : "";
    const historyText = (payload.history || [])
      .slice(-6)
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");
    const serviceNote = payload.serviceLabel
      ? `\nThe user is asking about: ${payload.serviceLabel}.`
      : "";

    const system = `You are SaarthiWorkforce AI Support Assistant for ${consumerType} users on TalentX (role prep, skill tests, InterviewX, manager/HR dashboards).

Formatting rules (follow strictly):
- Open with one short sentence acknowledging their question
- Use numbered steps (1. 2. 3.) for any procedure
- Use **bold** for menu names, buttons, and product names (TalentX, InterviewX)
- Keep tone professional, warm, and concise — like a trained support agent
- Maximum 4 short paragraphs; no bullet walls longer than 5 items
- Never mention JWT, API, Docker, MongoDB, backend, endpoints, tokens, error codes, or localhost
- Use ONLY facts from the Help library below — do not invent features or policies
- If the library cannot answer, say so briefly and suggest live agent or a support ticket`;

    const prompt = `Help library for ${consumerType}:
${faqContext}
${focusBlock}${serviceNote}

Recent chat:
${historyText}

Customer question: ${userMessage}

Write a clear, professional support reply using only the help library facts.`;

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 500,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const reply = data?.choices?.[0]?.message?.content?.trim();
        if (reply) {
          const cleaned = formatProfessionalReply(reply);
          if (isIrrelevantOrUnhelpfulReply(userMessage, cleaned)) {
            return {
              reply: IRRELEVANT_REPLY,
              sessionId,
              showConnectAgent: true,
              matchedFromDb: false,
              matchedFromGuide: false,
              intent: "irrelevant",
            };
          }
          const offerAgent = shouldOfferLiveAgent({
            userMessage,
            reply: cleaned,
            matchedFromGuide: false,
            matchedFromDb: Boolean(bestFaq),
          });
          return {
            reply: cleaned,
            sessionId,
            showConnectAgent: offerAgent,
            matchedFromDb: Boolean(bestFaq),
            matchedFromGuide: false,
            intent: offerAgent ? "live_agent_offer" : "ai_analyzed",
          };
        }
      }
    } catch {
      /* fallback below */
    }
  }

  // FAQ medium match without OpenAI — return DB answer directly
  if (faqMediumConfidence && faqScored) {
    return {
      reply: formatProfessionalReply(faqScored.faq.answer, {
        heading: faqScored.faq.question,
      }),
      sessionId,
      showConnectAgent: false,
      matchedFromDb: true,
      matchedFromGuide: false,
      suggestedCategory: faqScored.faq.category,
    };
  }

  if (isSupportRelatedMessage(userMessage)) {
    return {
      reply: NO_MATCH_REPLY,
      sessionId,
      showConnectAgent: true,
      matchedFromDb: false,
      matchedFromGuide: false,
      intent: "no_match",
    };
  }

  return {
    reply: IRRELEVANT_REPLY,
    sessionId,
    showConnectAgent: true,
    matchedFromDb: false,
    matchedFromGuide: false,
    intent: "irrelevant",
  };
}

/** Strip developer-facing wording from FAQ or AI text shown to customers */
function sanitizeFaqForCustomer(text: string): string {
  return text
    .replace(/\bCtrl\+F5\b/gi, "refresh the page")
    .replace(/\bDocker[^.]*\./gi, "Try signing out and back in, or use another browser.")
    .replace(/\bbackend[^.]*\./gi, "")
    .replace(/\bJWT[^.]*\./gi, "Try signing out and signing in again.")
    .replace(/\b\/api\/[^\s]+/gi, "the app")
    .replace(/\blocalhost:\d+/gi, "the app")
    .replace(/[^\S\n]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
