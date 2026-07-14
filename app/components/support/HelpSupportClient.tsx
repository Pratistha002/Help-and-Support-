"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { appPath } from "@/lib/apiBase";
import { getAuthFromStorage, type GuestUser } from "@/lib/auth";
import { resolveSupportAuth } from "@/lib/resolveSupportAuth";
import { supportApi } from "@/lib/supportApi";
import {
  CONSUMER_TYPES,
  LIVE_AGENT_OFFER_AFTER_EXCHANGES,
  LIVE_AGENT_OFFER_BODY,
  LIVE_AGENT_OFFER_PRIMARY_LABEL,
  LIVE_AGENT_OFFER_DISMISS_LABEL,
  LIVE_AGENT_OFFER_TITLE,
  LIVE_AGENT_CONNECT_MODAL_TITLE,
  LIVE_AGENT_CONNECT_MODAL_BODY,
  QUERY_NOT_LISTED_PROMPT,
  SUPPORT_EMAIL,
  resolveConsumerType,
  wantsLiveAgent,
  CHAT_SERVICES_BY_ROLE,
} from "@/lib/supportConstants";
import { getGeneralTopicsForRole, getPlatformGuideTopicsForRole } from "@/lib/aiGuides";
import { getFaqsForService, type FaqChip } from "@/lib/faqTopics";
import { buildChatSuggestionChips } from "@/lib/chatSuggestions";
import { clearChatState } from "@/lib/chatPersistence";
import { syncWorkforceAuthFromPage } from "@/lib/workforceSync";
import { IconBot, IconChevronDown, IconLiveChat, IconMail, IconPhone, IconRefresh, IconSend, IconSparkle } from "./HelpChatIcons";
import { SupportLoginGateModal } from "./SupportLoginGateModal";
import { AgentRatingPanel } from "./AgentRatingPanel";
import "./help.css";

type ChatMsg = { role: "user" | "assistant"; content: string; meta?: any };

function renderInlineMarkdown(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${keyPrefix}-b${i}`}>{part.slice(2, -2)}</strong>;
    }
    return part ? <span key={`${keyPrefix}-t${i}`}>{part}</span> : null;
  });
}

function formatChatText(text: string) {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return null;

  const blocks = normalized.split(/\n\n+/);

  return blocks.map((block, blockIndex) => {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) return null;

    const numberedLines = lines.filter((line) => /^\d+\.\s/.test(line));
    const bulletLines = lines.filter((line) => /^[•\-*]\s/.test(line));
    const firstNumberedIndex = lines.findIndex((line) => /^\d+\.\s/.test(line));

    if (numberedLines.length >= 2 && numberedLines.length === lines.length) {
      return (
        <ol key={`block-${blockIndex}`} className="sx-ai-msg-steps">
          {lines.map((line, lineIndex) => (
            <li key={lineIndex}>{renderInlineMarkdown(line.replace(/^\d+\.\s*/, ""), `n-${blockIndex}-${lineIndex}`)}</li>
          ))}
        </ol>
      );
    }

    if (firstNumberedIndex >= 0 && numberedLines.length >= 1) {
      const introLines = lines.slice(0, firstNumberedIndex);
      const stepLines = lines.slice(firstNumberedIndex).filter((line) => /^\d+\.\s/.test(line));
      const outroLines = lines.slice(firstNumberedIndex).filter((line) => !/^\d+\.\s/.test(line));

      return (
        <div key={`block-${blockIndex}`} className="sx-ai-msg-block">
          {introLines.length ? (
            <p className="sx-ai-msg-paragraph">{renderInlineMarkdown(introLines.join(" "), `i-${blockIndex}`)}</p>
          ) : null}
          {stepLines.length ? (
            <ol className="sx-ai-msg-steps">
              {stepLines.map((line, lineIndex) => (
                <li key={lineIndex}>
                  {renderInlineMarkdown(line.replace(/^\d+\.\s*/, ""), `m-${blockIndex}-${lineIndex}`)}
                </li>
              ))}
            </ol>
          ) : null}
          {outroLines.length ? (
            <p className="sx-ai-msg-paragraph">{renderInlineMarkdown(outroLines.join(" "), `o-${blockIndex}`)}</p>
          ) : null}
        </div>
      );
    }

    if (bulletLines.length >= 1 && bulletLines.length === lines.length) {
      return (
        <ul key={`block-${blockIndex}`} className="sx-ai-msg-list">
          {lines.map((line, lineIndex) => (
            <li key={lineIndex}>{renderInlineMarkdown(line.replace(/^[•\-*]\s*/, ""), `u-${blockIndex}-${lineIndex}`)}</li>
          ))}
        </ul>
      );
    }

    const joined = lines.join(" ");
    if (/^\*\*[^*]+\*\*$/.test(joined)) {
      return (
        <p key={`block-${blockIndex}`} className="sx-ai-msg-heading">
          {renderInlineMarkdown(joined, `h-${blockIndex}`)}
        </p>
      );
    }

    return (
      <p key={`block-${blockIndex}`} className="sx-ai-msg-paragraph">
        {renderInlineMarkdown(joined, `p-${blockIndex}`)}
      </p>
    );
  });
}

function AiAvatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return (
    <span className={`sx-ai-avatar sx-ai-avatar--${size}`} aria-hidden>
      <IconBot size={size === "lg" ? 22 : size === "sm" ? 14 : 18} />
    </span>
  );
}

function AiMessageRow({
  children,
  role = "assistant",
}: {
  children: React.ReactNode;
  role?: "assistant" | "user";
}) {
  return (
    <div className={`sx-ai-message-row sx-ai-message-row--${role}`}>
      {role === "assistant" ? <AiAvatar size="sm" /> : null}
      <div className={`sx-help-msg sx-help-msg--${role}`}>{children}</div>
      {role === "user" ? <span className="sx-ai-avatar-spacer" aria-hidden /> : null}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="sx-ai-message-row sx-ai-message-row--assistant">
      <AiAvatar size="sm" />
      <div className="sx-help-msg sx-help-msg--assistant sx-ai-typing" aria-label="AI is thinking">
        <span className="sx-ai-typing-dot" />
        <span className="sx-ai-typing-dot" />
        <span className="sx-ai-typing-dot" />
      </div>
    </div>
  );
}

function filterFaqList(faqs: any[], query: string): any[] {
  const q = query.trim();
  if (!q) return faqs;
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  return faqs.filter((f) => {
    const haystack = `${f.question || ""} ${f.answer || ""} ${f.category || ""}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

export function HelpSupportClient() {
  const [auth, setAuth] = useState<{ token: string; user: GuestUser | null }>({ token: "", user: null });
  const [consumerType, setConsumerType] = useState("EMPLOYEE");
  const [allFaqs, setAllFaqs] = useState<any[]>([]);
  const [faqSearch, setFaqSearch] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [chatMode, setChatMode] = useState<"ai" | "agent">("ai");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [aiExchangeCount, setAiExchangeCount] = useState(0);
  const [showInChatAgentOffer, setShowInChatAgentOffer] = useState(false);
  const [agentOfferDismissed, setAgentOfferDismissed] = useState(false);
  const [flowPhase, setFlowPhase] = useState<"role" | "general" | "platform" | "chat">("role");
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [serviceFaqChips, setServiceFaqChips] = useState<FaqChip[]>([]);
  const [loginGate, setLoginGate] = useState<{ open: boolean; feature: string; returnPath: string }>({
    open: false,
    feature: "",
    returnPath: "/help-and-support",
  });
  const [toast, setToast] = useState("");
  const [showAllFaqs, setShowAllFaqs] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  const [liveSession, setLiveSession] = useState<any>(null);
  const [liveMessages, setLiveMessages] = useState<any[]>([]);
  const [liveInput, setLiveInput] = useState("");
  const [liveLoading, setLiveLoading] = useState(false);
  const [noAgentModal, setNoAgentModal] = useState(false);
  const [showAgentConnectModal, setShowAgentConnectModal] = useState(false);
  const [queryNotListedPending, setQueryNotListedPending] = useState(false);
  const [showAgentRating, setShowAgentRating] = useState(false);
  const [ratingSession, setRatingSession] = useState<any>(null);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const chatColRef = useRef<HTMLDivElement>(null);
  const faqColRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<number | null>(null);
  const liveStatusRef = useRef<string | null>(null);

  const scrollMessagesToBottom = useCallback(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const focusChatPanel = useCallback(() => {
    requestAnimationFrame(() => {
      chatColRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, []);

  const openAiPanel = useCallback(() => {
    setAiPanelOpen(true);
    setChatMode("ai");
    setOpenFaq(null);
    setAgentOfferDismissed(false);
    setShowInChatAgentOffer(false);
    setShowAgentConnectModal(false);
    if (auth.user) {
      setConsumerType(resolveConsumerType(auth.user));
      setFlowPhase("platform");
    }
  }, [auth.user]);

  useEffect(() => {
    if (!aiPanelOpen) return;
    const timer = window.setTimeout(() => {
      chatColRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [aiPanelOpen]);

  useEffect(() => {
    clearChatState();
  }, []);

  useEffect(() => {
    const sync = () => {
      const next = resolveSupportAuth();
      setAuth({ token: next.token, user: next.user });
    };
    sync();
    window.addEventListener("hs-auth-changed", sync);
    window.addEventListener("jbv2-org-auth-changed", sync);
    window.addEventListener("workforce-help-sync-done", sync);
    return () => {
      window.removeEventListener("hs-auth-changed", sync);
      window.removeEventListener("jbv2-org-auth-changed", sync);
      window.removeEventListener("workforce-help-sync-done", sync);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = await syncWorkforceAuthFromPage().catch(() => false);
      if (cancelled) return;
      if (ok) {
        const hs = getAuthFromStorage();
        if (hs.token && hs.user) setAuth({ token: hs.token, user: hs.user });
        else {
          const next = resolveSupportAuth();
          setAuth({ token: next.token, user: next.user });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (auth.user) {
      setConsumerType(resolveConsumerType(auth.user));
      setFlowPhase("platform");
    }
  }, [auth.user]);

  useEffect(() => {
    supportApi.getFaqs(consumerType).then(setAllFaqs).catch(() => setAllFaqs([]));
    setOpenFaq(null);
    setFaqSearch("");
    setShowAllFaqs(false);
  }, [consumerType]);

  const filteredFaqs = useMemo(() => filterFaqList(allFaqs, faqSearch), [allFaqs, faqSearch]);

  useEffect(() => {
    if (!faqSearch.trim()) return;
    const timer = window.setTimeout(() => {
      faqColRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [faqSearch]);

  useEffect(() => {
    if (faqSearch.trim() && filteredFaqs.length > 0) setOpenFaq(0);
  }, [faqSearch, filteredFaqs.length]);

  useEffect(() => {
    scrollMessagesToBottom();
  }, [messages.length, liveMessages.length, aiLoading, liveLoading, scrollMessagesToBottom]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 4000);
  }, []);

  const startLivePolling = useCallback(
    (sessionId: string) => {
      stopPolling();
      pollRef.current = window.setInterval(async () => {
        try {
          const s = await supportApi.liveChatSession(sessionId);
          if (s) {
            const prev = liveStatusRef.current;
            if (prev === "PENDING" && s.status === "ACTIVE") {
              showToast("An agent joined — you can chat now!");
            }
            liveStatusRef.current = s.status;
            setLiveSession(s);
          }
          const msgs = await supportApi.liveChatMessages(sessionId);
          setLiveMessages(msgs);
          if (s?.status === "ACTIVE") setLiveLoading(false);
          if (s?.status === "REJECTED") {
            stopPolling();
            setNoAgentModal(true);
            setChatMode("ai");
            liveStatusRef.current = null;
          }
          if (s?.status === "CLOSED") {
            stopPolling();
            liveStatusRef.current = null;
            if (s.assignedAdminId || s.assignedAdminEmail) {
              setRatingSession(s);
              setShowAgentRating(true);
              void supportApi
                .liveChatGetRating(sessionId)
                .then((res) => {
                  if (res?.rating) {
                    setShowAgentRating(false);
                    setChatMode("ai");
                  }
                })
                .catch(() => {
                  /* show rating UI anyway */
                });
            } else {
              setChatMode("ai");
            }
          }
        } catch {
          /* ignore */
        }
      }, 2000);
    },
    [stopPolling, showToast],
  );

  const cancelLiveWait = useCallback(async () => {
    if (liveSession?.id && liveSession.status === "PENDING") {
      try {
        await supportApi.liveChatClose(liveSession.id);
      } catch {
        /* ignore */
      }
    }
    stopPolling();
    liveStatusRef.current = null;
    setLiveSession(null);
    setLiveMessages([]);
    setLiveLoading(false);
    setChatMode("ai");
    showToast("Live chat request cancelled.");
  }, [liveSession, stopPolling, showToast]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const ensureHsToken = useCallback(async (): Promise<boolean> => {
    return syncWorkforceAuthFromPage();
  }, []);

  const requireLogin = useCallback(
    async (featureLabel: string, returnPath = "/help-and-support"): Promise<boolean> => {
      await ensureHsToken();
      const hs = getAuthFromStorage();
      if (hs.token && hs.user) {
        setAuth({ token: hs.token, user: hs.user });
        return true;
      }
      setLoginGate({ open: true, feature: featureLabel, returnPath });
      return false;
    },
    [ensureHsToken],
  );

  const startLiveChatAfterAuth = useCallback(async () => {
    const resolved = resolveSupportAuth();
    const token = resolved.token || getAuthFromStorage().token;
    const user = resolved.user || getAuthFromStorage().user;
    if (!token) return;
    setChatMode("agent");
    setShowInChatAgentOffer(false);
    setLiveLoading(true);
    try {
      const existing = await supportApi.liveChatActiveSession().catch(() => null);
      if (existing?.id && (existing.status === "ACTIVE" || existing.status === "PENDING")) {
        liveStatusRef.current = existing.status;
        setLiveSession(existing);
        const msgs = await supportApi.liveChatMessages(existing.id);
        setLiveMessages(msgs);
        startLivePolling(existing.id);
        setLiveLoading(existing.status !== "ACTIVE");
        return;
      }
      const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content?.trim();
      const session = await supportApi.liveChatRequest({
        initialMessage: lastUserMsg || undefined,
        consumerType,
        serviceLabel: selectedService || undefined,
      });
      liveStatusRef.current = session.status;
      setLiveSession(session);
      const msgs = await supportApi.liveChatMessages(session.id);
      setLiveMessages(msgs);
      startLivePolling(session.id);
      showToast("Request sent — waiting for a support agent to accept.");
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (/ECONNREFUSED|MongoNetworkError|connect.*27017/i.test(msg)) {
        showToast("Support service is temporarily unavailable. Please try again in a moment or create a ticket.");
      } else if (/401|403|Login required|Unauthorized/i.test(msg)) {
        showToast("Sign in to request a live chat with an agent.");
        setLoginGate({ open: true, feature: "live chat", returnPath: "/help-and-support" });
      } else {
        showToast(msg || "Could not start live chat");
      }
      setChatMode("ai");
    } finally {
      setLiveLoading(false);
    }
  }, [consumerType, messages, selectedService, startLivePolling, showToast]);

  const shouldOfferLiveAgentConnect = (res: {
    intent?: string;
    showConnectAgent?: boolean;
  }) =>
    Boolean(
      res.showConnectAgent ||
      res.intent === "irrelevant" ||
      res.intent === "no_match" ||
      res.intent === "live_agent_offer",
    );

  const openLiveAgent = async () => {
    setAiPanelOpen(true);
    setShowAgentConnectModal(false);
    setShowInChatAgentOffer(false);
    setFlowPhase("chat");
    const ok = await requireLogin("live chat", "/help-and-support");
    if (!ok) {
      setChatMode("ai");
      showToast("Sign in to request a live chat with an agent.");
      return;
    }
    setChatMode("agent");
    await startLiveChatAfterAuth();
  };

  const generalTopics = getGeneralTopicsForRole(consumerType);
  const platformGuideTopics = getPlatformGuideTopicsForRole(consumerType);
  const platformServices = CHAT_SERVICES_BY_ROLE[consumerType] || [];
  const roleLabel = CONSUMER_TYPES.find((r) => r.id === consumerType)?.label || "User";
  const userFirstName = auth.user?.fullName?.split(" ")[0];

  const chatSuggestions = useMemo(
    () =>
      buildChatSuggestionChips({
        consumerType,
        serviceFaqChips,
        askedMessages: messages.filter((m) => m.role === "user").map((m) => m.content),
      }),
    [consumerType, serviceFaqChips, messages],
  );

  const pickGeneralTopic = (prompt: string) => {
    setFlowPhase("chat");
    setSelectedService(null);
    setServiceFaqChips([]);
    setAgentOfferDismissed(false);
    setShowInChatAgentOffer(false);
    void sendAiMessage(prompt);
  };

  const startFreeChat = () => {
    setFlowPhase("chat");
    setAgentOfferDismissed(false);
    setShowInChatAgentOffer(false);
    setMessages([
      {
        role: "assistant",
        content: "Hi! Pick a common question below or type your own — I'll walk you through step by step.",
      },
    ]);
  };

  const startServiceChat = (service: { id: string; label: string }) => {
    setSelectedService(service.label);
    setServiceFaqChips(getFaqsForService(consumerType, service.id));
    setFlowPhase("chat");
    setAgentOfferDismissed(false);
    setShowInChatAgentOffer(false);
    setMessages([
      {
        role: "assistant",
        content: `You selected **${service.label}**. Pick a common question below or describe your issue.`,
      },
    ]);
  };

  const sendAiMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || aiLoading) return;
    const fromQueryNotListed = queryNotListedPending;
    if (fromQueryNotListed) setQueryNotListedPending(false);

    if (wantsLiveAgent(trimmed)) {
      setMessages((p) => [
        ...p,
        { role: "user", content: trimmed },
        { role: "assistant", content: "I'll connect you with a live support agent.", meta: { showConnectAgent: true } },
      ]);
      setShowInChatAgentOffer(true);
      setShowAgentConnectModal(true);
      setInput("");
      return;
    }
    setMessages((p) => [...p, { role: "user", content: trimmed }]);
    setInput("");
    setAiLoading(true);
    try {
      const history = messages.slice(-8).map((m) => ({ role: m.role, content: m.content }));
      const res = await supportApi.aiChat({
        message: trimmed,
        consumerType,
        sessionId,
        history,
        serviceLabel: selectedService || undefined,
      });
      setSessionId(res.sessionId || sessionId);
      const offerAgent = fromQueryNotListed || shouldOfferLiveAgentConnect(res);
      const assistantMeta = {
        ...res,
        showConnectAgent: offerAgent,
      };
      setMessages((p) => [...p, { role: "assistant", content: res.reply, meta: assistantMeta }]);
      const wasResolved = Boolean(res.matchedFromGuide || res.matchedFromDb);

      if (fromQueryNotListed) {
        // After "Query not listed": one-step AI answer (if any), then connect-with-agent popup.
        setShowInChatAgentOffer(true);
        setShowAgentConnectModal(true);
        setAgentOfferDismissed(false);
      } else {
        setAiExchangeCount((prev) => {
          const next = prev + 1;
          if (wasResolved) {
            setShowInChatAgentOffer(false);
            setShowAgentConnectModal(false);
          } else if (offerAgent && !agentOfferDismissed) {
            setShowInChatAgentOffer(true);
          } else if (next >= LIVE_AGENT_OFFER_AFTER_EXCHANGES && !agentOfferDismissed) {
            setShowInChatAgentOffer(true);
          }
          return next;
        });
      }
    } catch {
      setMessages((p) => [
        ...p,
        {
          role: "assistant",
          content: "Sorry, I couldn't reach support AI right now.",
          meta: { showConnectAgent: true, intent: "no_match" },
        },
      ]);
      if (fromQueryNotListed || !agentOfferDismissed) {
        setShowInChatAgentOffer(true);
        if (fromQueryNotListed) setShowAgentConnectModal(true);
      }
    } finally {
      setAiLoading(false);
    }
  };

  const handleQueryNotListed = () => {
    setQueryNotListedPending(true);
    setAgentOfferDismissed(false);
    setShowInChatAgentOffer(false);
    setShowAgentConnectModal(false);
    setMessages((p) => [
      ...p,
      { role: "user", content: "My query isn't listed" },
      {
        role: "assistant",
        content: QUERY_NOT_LISTED_PROMPT,
      },
    ]);
  };

  const dismissAgentRating = () => {
    setShowAgentRating(false);
    setRatingSession(null);
    setLiveSession(null);
    setLiveMessages([]);
    setChatMode("ai");
  };

  const submitAgentRating = async (payload: { rating: number; comment: string; tags: string[] }) => {
    if (!ratingSession?.id) return;
    setRatingSubmitting(true);
    try {
      await supportApi.liveChatSubmitRating(ratingSession.id, payload);
      showToast("Thanks for rating your agent!");
    } catch (e: any) {
      showToast(e?.message || "Could not save rating");
      throw e;
    } finally {
      setRatingSubmitting(false);
    }
  };

  const handleBackToMenu = () => {
    setSelectedService(null);
    setServiceFaqChips([]);
    setShowInChatAgentOffer(false);
    setAgentOfferDismissed(false);
    setQueryNotListedPending(false);
    setFlowPhase(auth.user ? "platform" : "role");
  };

  const handleSuggestionChip = (chip: ReturnType<typeof buildChatSuggestionChips>[number]) => {
    if (chip.kind === "query-not-listed") {
      handleQueryNotListed();
      return;
    }
    if (chip.kind === "back-to-menu") {
      handleBackToMenu();
      return;
    }
    if (chip.prompt) void sendAiMessage(chip.prompt);
  };

  const sendLiveMessage = async () => {
    const t = liveInput.trim();
    if (!t || !liveSession?.id || liveSession.status !== "ACTIVE") return;
    setLiveInput("");
    try {
      const msg = await supportApi.liveChatSend(liveSession.id, t);
      setLiveMessages((p) => [...p, msg]);
    } catch (e: any) {
      showToast(e?.message || "Send failed");
    }
  };

  const handleChannel = async (id: string) => {
    if (id === "LIVE_CHAT") {
      setAiPanelOpen(true);
      focusChatPanel();
      void openLiveAgent();
      return;
    }
    if (id === "EMAIL") {
      const ok = await requireLogin("email support", "/help-and-support/email-support");
      if (!ok) return;
      window.location.href = appPath("/help-and-support/email-support");
      return;
    }
    if (id === "CALL") {
      const ok = await requireLogin("request a callback", "/help-and-support/call-support");
      if (!ok) return;
      window.location.href = appPath("/help-and-support/call-support");
      return;
    }
    if (id === "TICKET") window.location.href = appPath("/help-and-support/support-form");
    else if (id === "TRACK") window.location.href = appPath("/help-and-support/track-tickets");
  };

  const isFaqSearchActive = faqSearch.trim().length > 0;
  const displayedFaqs = isFaqSearchActive || showAllFaqs ? filteredFaqs : filteredFaqs.slice(0, 5);
  const hasMoreFaqs = !isFaqSearchActive && filteredFaqs.length > 5 && !showAllFaqs;

  const handleFaqSearchChange = (value: string) => {
    setFaqSearch(value);
    if (value.trim()) {
      setAiPanelOpen(false);
      setOpenFaq(null);
    }
  };

  const refreshChat = useCallback(() => {
    void (async () => {
      if (liveSession?.id && (liveSession.status === "PENDING" || liveSession.status === "ACTIVE")) {
        try {
          await supportApi.liveChatClose(liveSession.id);
        } catch {
          /* ignore */
        }
      }
      clearChatState();
      stopPolling();
      liveStatusRef.current = null;
      setLiveSession(null);
      setLiveMessages([]);
      setLiveInput("");
      setLiveLoading(false);
      setShowAgentRating(false);
      setRatingSession(null);
      setQueryNotListedPending(false);
      setMessages([]);
      setSessionId(null);
      setInput("");
      setAiExchangeCount(0);
      setShowInChatAgentOffer(false);
      setShowAgentConnectModal(false);
      setAgentOfferDismissed(false);
      setSelectedService(null);
      setServiceFaqChips([]);
      setChatMode("ai");
      setFlowPhase(auth.user ? "platform" : "role");
      showToast("Chat refreshed — start a new conversation.");
    })();
  }, [auth.user, liveSession, stopPolling, showToast]);

  return (
    <div className="sx-help-page">
      {toast ? <div className="sx-help-toast">{toast}</div> : null}

      <div className="sx-help-layout">
        <section className="sx-help-hero">
          <div className="sx-help-hero__top">
            <div className="sx-help-hero__intro">
              <span className="sx-help-hero__kicker">SX Workforce · Support</span>
              <h1>Help & Support</h1>
              <p>Get answers about TalentX, role preparation, manager dashboards, and InterviewX.</p>
            </div>
            <button type="button" className="sx-help-hero__track-btn" onClick={() => handleChannel("TRACK")}>
              Track ticket
            </button>
          </div>
          <div className="sx-help-search-wrap" role="search">
            <span className="sx-help-search-icon" aria-hidden>🔍</span>
            <input
              className="sx-help-search"
              type="search"
              placeholder="Search FAQs…"
              value={faqSearch}
              onChange={(e) => handleFaqSearchChange(e.target.value)}
              aria-label="Search FAQs"
            />
            {isFaqSearchActive ? (
              <button
                type="button"
                className="sx-help-search-clear"
                onClick={() => handleFaqSearchChange("")}
                aria-label="Clear FAQ search"
              >
                ×
              </button>
            ) : null}
          </div>
          {!auth.user ? (
            <div className="sx-help-role-tabs">
              {CONSUMER_TYPES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={consumerType === r.id ? "active" : ""}
                  onClick={() => {
                    setConsumerType(r.id);
                    setFlowPhase("general");
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <div className="sx-help-deck">
          <div className="sx-help-main-grid">
            <section className="sx-help-faq-block" aria-labelledby="sx-help-faq-heading">
            <div className="sx-help-faq-col" ref={faqColRef}>
              <div className="sx-help-faq-header">
                <h2 id="sx-help-faq-heading">Frequently Asked Questions</h2>
                <p>
                  {isFaqSearchActive ? (
                    <>
                      {filteredFaqs.length} result{filteredFaqs.length !== 1 ? "s" : ""} for &ldquo;{faqSearch.trim()}&rdquo; in{" "}
                      {CONSUMER_TYPES.find((r) => r.id === consumerType)?.label || "your"} FAQs
                    </>
                  ) : (
                    <>
                      {allFaqs.length} article{allFaqs.length !== 1 ? "s" : ""} for{" "}
                      {CONSUMER_TYPES.find((r) => r.id === consumerType)?.label || "you"}
                    </>
                  )}
                </p>
                <div className="sx-help-search-wrap sx-help-search-wrap--faq" role="search">
                  <span className="sx-help-search-icon" aria-hidden>
                    🔍
                  </span>
                  <input
                    className="sx-help-search"
                    type="search"
                    placeholder="Search FAQs…"
                    value={faqSearch}
                    onChange={(e) => handleFaqSearchChange(e.target.value)}
                    aria-label="Search FAQs"
                  />
                  {isFaqSearchActive ? (
                    <button
                      type="button"
                      className="sx-help-search-clear"
                      onClick={() => handleFaqSearchChange("")}
                      aria-label="Clear FAQ search"
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              </div>
              <div className={`sx-help-faq-section ${aiPanelOpen ? "sx-help-faq-section--ai-open" : ""}`}>
              {!aiPanelOpen ? (
                <>
                  <div className="sx-help-faq-list">
                    {filteredFaqs.length === 0 ? (
                      <div className="sx-help-empty-faq">
                        {isFaqSearchActive
                          ? `No FAQs match "${faqSearch.trim()}". Try different keywords or use Ask AI assistant below.`
                          : "No FAQs found. Try a different search or role."}
                      </div>
                    ) : (
                      displayedFaqs.map((f, i) => {
                        const isOpen = openFaq === i;
                        return (
                          <div key={f._id || i} className={`sx-help-faq-item ${isOpen ? "open" : ""}`}>
                            <button type="button" className="sx-help-faq-q" onClick={() => setOpenFaq(isOpen ? null : i)}>
                              <span className="sx-help-faq-q__content">
                                {f.category ? (
                                  <span className="sx-help-faq-cat">{f.category}</span>
                                ) : null}
                                <span className="sx-help-faq-question">{f.question}</span>
                              </span>
                              <span className="sx-help-faq-chevron" aria-hidden>
                                <IconChevronDown size={18} />
                              </span>
                            </button>
                            {isOpen ? <div className="sx-help-faq-a">{f.answer}</div> : null}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {hasMoreFaqs ? (
                    <button type="button" className="sx-help-faq-view-all" onClick={() => setShowAllFaqs(true)}>
                      View All Articles
                    </button>
                  ) : null}
                </>
              ) : null}

              <div className={`sx-help-chat-col ${aiPanelOpen ? "sx-help-chat-col--open" : ""}`} ref={chatColRef}>
              <div className="sx-ai-chat-header">
                <div className="sx-ai-chat-identity">
                  <AiAvatar size="lg" />
                  <div className="sx-ai-chat-identity__text">
                    <strong>{chatMode === "ai" ? "SaarthiWorkforce AI" : "Live Support"}</strong>
                    <span className="sx-ai-online">
                      <span className="sx-ai-online-dot" />
                      {chatMode === "ai"
                        ? "Online"
                        : liveSession?.status === "ACTIVE"
                          ? "Agent connected"
                          : liveSession?.status === "PENDING"
                            ? "Waiting for agent"
                            : "Connect with a human"}
                    </span>
                  </div>
                </div>
                <div className="sx-ai-chat-header__actions">
                  {chatMode === "ai" ? (
                    <button
                      type="button"
                      className="sx-help-chat-refresh sx-help-chat-refresh--icon"
                      onClick={refreshChat}
                      title="Start a new conversation"
                      aria-label="Refresh chat"
                    >
                      <IconRefresh size={16} />
                    </button>
                  ) : (
                    <>
                      <div className="sx-help-chat-tabs">
                        <button
                          type="button"
                          className="sx-help-chat-tab"
                          onClick={() => { void cancelLiveWait(); }}
                        >
                          <IconSparkle size={15} />
                          AI Chat
                        </button>
                        <button
                          type="button"
                          className="sx-help-chat-tab live active"
                          onClick={() => { setAiPanelOpen(true); setFlowPhase("chat"); focusChatPanel(); void openLiveAgent(); }}
                          title={auth.user ? "Chat with a live agent" : "Sign in required for live chat"}
                        >
                          <IconLiveChat size={15} />
                          Live Agent
                        </button>
                      </div>
                      <button
                        type="button"
                        className="sx-help-chat-refresh"
                        onClick={refreshChat}
                        title="Start a new conversation"
                        aria-label="Refresh chat"
                      >
                        <IconRefresh size={14} />
                        New chat
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="sx-ai-chat-header__close"
                    onClick={() => setAiPanelOpen(false)}
                    aria-label="Close chat"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="sx-help-chat-body-wrap">
              {chatMode === "ai" ? (
                <>
                  {flowPhase === "role" && !auth.user ? (
                    <div className="sx-help-messages sx-ai-welcome" ref={messagesContainerRef}>
                      <AiMessageRow>
                        <p className="sx-ai-welcome-title">Welcome to SaarthiWorkforce Support</p>
                        <p>To give you the right answers, tell me your role first.</p>
                      </AiMessageRow>
                      <div className="sx-ai-suggestions">
                        {CONSUMER_TYPES.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            className="sx-ai-suggestion"
                            onClick={() => { setConsumerType(r.id); setFlowPhase("general"); }}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : flowPhase === "general" ? (
                    <div className="sx-help-messages sx-ai-welcome" ref={messagesContainerRef}>
                      <AiMessageRow>
                        <p className="sx-ai-welcome-title">Hi{auth.user?.fullName ? `, ${auth.user.fullName.split(" ")[0]}` : ""}!</p>
                        <p>Start with login, profile, or billing — or browse platform topics if you need help with TalentX, tests, or dashboards.</p>
                      </AiMessageRow>
                      <div className="sx-ai-suggestion-group">
                        <span className="sx-ai-suggestion-group__label">Account &amp; common issues</span>
                        <div className="sx-ai-suggestions sx-ai-suggestions--inline">
                          {generalTopics.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              className="sx-ai-suggestion"
                              onClick={() => pickGeneralTopic(t.prompt)}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="sx-ai-suggestion-nav">
                        <button type="button" className="sx-ai-suggestion sx-ai-suggestion--nav" onClick={() => setFlowPhase("platform")}>
                          TalentX, tests &amp; platform topics →
                        </button>
                        <button type="button" className="sx-ai-suggestion sx-ai-suggestion--outline" onClick={startFreeChat}>
                          Type a different question
                        </button>
                      </div>
                    </div>
                  ) : flowPhase === "platform" ? (
                    <div className="sx-help-messages sx-ai-welcome" ref={messagesContainerRef}>
                      <AiMessageRow>
                        <p className="sx-ai-welcome-title">
                          Hi{userFirstName ? ` ${userFirstName}` : ""}! 👋
                        </p>
                        <p>
                          {auth.user
                            ? `You're logged in as a ${roleLabel}. What do you need help with?`
                            : `You're browsing as a ${roleLabel}. What do you need help with?`}
                        </p>
                        <span className="sx-ai-msg-time">Just now</span>
                      </AiMessageRow>
                      <div className="sx-ai-suggestion-group">
                        <span className="sx-ai-suggestion-group__label">{roleLabel.toUpperCase()} SERVICES</span>
                        <div className="sx-ai-service-chips">
                          {platformServices.map((s) => (
                            <button key={s.id} type="button" className="sx-ai-service-chip" onClick={() => startServiceChat(s)}>
                              {s.label}
                            </button>
                          ))}
                          {platformGuideTopics
                            .filter((g) => !platformServices.some((s) => s.id === g.id))
                            .map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                className="sx-ai-service-chip"
                                onClick={() => pickGeneralTopic(t.prompt)}
                              >
                                {t.label}
                              </button>
                            ))}
                          <button type="button" className="sx-ai-service-chip sx-ai-service-chip--outline" onClick={startFreeChat}>
                            Something else
                          </button>
                        </div>
                      </div>
                      {!auth.user ? (
                        <div className="sx-ai-suggestion-nav">
                          <button type="button" className="sx-ai-suggestion sx-ai-suggestion--back" onClick={() => setFlowPhase("general")}>
                            ← Back to login &amp; account help
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="sx-help-messages" ref={messagesContainerRef}>
                      {messages.length === 0 ? (
                        <AiMessageRow>
                          Hi! Pick a common question below or ask about TalentX, role prep, login, or reports.
                        </AiMessageRow>
                      ) : null}
                      {messages.map((m, i) => (
                        <AiMessageRow key={i} role={m.role}>
                          <div className={m.meta?.intent === "irrelevant" ? "sx-help-msg--irrelevant" : undefined}>
                            {formatChatText(m.content)}
                          </div>
                          {m.meta?.showConnectAgent ? (
                            <button type="button" className="sx-help-connect-btn" onClick={() => void openLiveAgent()}>
                              Connect with live agent
                            </button>
                          ) : null}
                        </AiMessageRow>
                      ))}
                      {aiLoading ? <TypingIndicator /> : null}
                      {showInChatAgentOffer && !agentOfferDismissed ? (
                        <div className="sx-help-agent-offer-inline" role="dialog" aria-labelledby="sx-help-agent-offer-title">
                          <div className="sx-help-agent-offer-inline__icon" aria-hidden><IconLiveChat size={22} /></div>
                          <h4 id="sx-help-agent-offer-title">{LIVE_AGENT_OFFER_TITLE}</h4>
                          <p>{LIVE_AGENT_OFFER_BODY}</p>
                          <div className="sx-help-agent-offer-inline__actions">
                            <button
                              type="button"
                              className="primary"
                              onClick={() => {
                                setShowInChatAgentOffer(false);
                                void openLiveAgent();
                              }}
                            >
                              {LIVE_AGENT_OFFER_PRIMARY_LABEL}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowInChatAgentOffer(false);
                                setAgentOfferDismissed(true);
                              }}
                            >
                              {LIVE_AGENT_OFFER_DISMISS_LABEL}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                  {flowPhase === "general" || flowPhase === "platform" || (flowPhase === "role" && !auth.user) ? (
                    <div className="sx-help-input-row sx-ai-input-row">
                      <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && input.trim()) {
                            setFlowPhase("chat");
                            void sendAiMessage(input);
                          }
                        }}
                        placeholder={
                          flowPhase === "platform"
                            ? "Ask anything…"
                            : "Or type your question (login, refund, report…)"
                        }
                      />
                      <button
                        type="button"
                        className="sx-ai-send-btn"
                        onClick={() => {
                          if (!input.trim()) return;
                          setFlowPhase("chat");
                          void sendAiMessage(input);
                        }}
                        disabled={!input.trim()}
                        aria-label="Send message"
                      >
                        <IconSend size={18} />
                      </button>
                    </div>
                  ) : flowPhase === "chat" ? (
                    <>
                      <div className="sx-help-quick-topics" aria-label="Common questions">
                        <span className="sx-help-quick-topics__label">Suggested questions</span>
                        <div className="sx-help-quick-topics__row">
                          {chatSuggestions.map((chip) => (
                            <button
                              key={chip.id}
                              type="button"
                              className={`sx-help-quick-topic${chip.kind !== "topic" ? " sx-help-quick-topic--action" : ""}`}
                              disabled={aiLoading}
                              onClick={() => handleSuggestionChip(chip)}
                            >
                              {chip.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="sx-help-input-row sx-ai-input-row">
                        <input
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && void sendAiMessage(input)}
                          placeholder="Ask anything…"
                        />
                        <button
                          type="button"
                          className="sx-ai-send-btn"
                          onClick={() => void sendAiMessage(input)}
                          disabled={aiLoading || !input.trim()}
                          aria-label="Send message"
                        >
                          <IconSend size={18} />
                        </button>
                      </div>
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  <div className="sx-help-messages" ref={messagesContainerRef}>
                    {liveLoading && liveSession?.status !== "PENDING" ? (
                      <div className="sx-help-msg sx-help-msg--system">Connecting to an agent…</div>
                    ) : null}
                    {liveMessages.length === 0 && !liveLoading && liveSession?.status !== "PENDING" && !showAgentRating ? (
                      <div className="sx-help-msg sx-help-msg--assistant">
                        Start a conversation with our support team. Messages appear here once connected.
                      </div>
                    ) : null}
                    {liveMessages.map((m) => {
                      if (m.senderType === "SYSTEM") {
                        return (
                          <div key={m.id} className="sx-help-msg sx-help-msg--system">
                            {m.content}
                          </div>
                        );
                      }
                      const isUser = m.senderType === "USER";
                      return (
                        <div
                          key={m.id}
                          className={`sx-ai-message-row sx-ai-message-row--${isUser ? "user" : "assistant"}`}
                        >
                          {!isUser ? <AiAvatar size="sm" /> : null}
                          <div className={`sx-help-msg ${isUser ? "sx-help-msg--user" : "sx-help-msg--assistant"}`}>
                            {m.senderType === "ADMIN" && m.senderName ? (
                              <div className="sx-help-msg-avatar">{m.senderName}</div>
                            ) : null}
                            {m.content}
                          </div>
                          {isUser ? <span className="sx-ai-avatar-spacer" aria-hidden /> : null}
                        </div>
                      );
                    })}
                    {showAgentRating && (liveSession?.status === "CLOSED" || ratingSession) ? (
                      <div className="sx-help-msg sx-help-msg--system">This live chat has ended. Please rate your agent below.</div>
                    ) : null}
                  </div>
                  {showAgentRating && (ratingSession || liveSession) ? (
                    <AgentRatingPanel
                      agentName={
                        (ratingSession || liveSession)?.assignedAdminName ||
                        (ratingSession || liveSession)?.assignedAdminEmail
                      }
                      submitting={ratingSubmitting}
                      onSubmit={submitAgentRating}
                      onSkip={dismissAgentRating}
                    />
                  ) : (
                    <div className="sx-help-input-row sx-ai-input-row">
                      <input
                        value={liveInput}
                        onChange={(e) => setLiveInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && void sendLiveMessage()}
                        placeholder={liveSession?.status === "ACTIVE" ? "Message your agent…" : "Waiting for agent to accept…"}
                        disabled={liveSession?.status !== "ACTIVE"}
                      />
                      <button
                        type="button"
                        className="sx-ai-send-btn sx-ai-send-btn--live"
                        onClick={() => void sendLiveMessage()}
                        disabled={liveSession?.status !== "ACTIVE" || !liveInput.trim()}
                        aria-label="Send message"
                      >
                        <IconSend size={18} />
                      </button>
                    </div>
                  )}
                </>
              )}
              </div>
              </div>
            </div>
            </div>
            </section>

            <section className="sx-help-direct-block" aria-labelledby="sx-help-direct-heading">
            <aside className="sx-help-contact-sidebar">
              <div className="sx-help-sidebar-card">
                <div className="sx-help-direct-support__head">
                  <span className="sx-help-direct-support__badge">
                    <span className="sx-help-direct-support__badge-dot" aria-hidden />
                    Direct support
                  </span>
                  <h3 id="sx-help-direct-heading">Need direct help?</h3>
                  <p>Can&apos;t find your answer? Reach our team directly.</p>
                </div>

                <div className="sx-help-email-card">
                  <div className="sx-help-email-card__top">
                    <span className="sx-help-email-card__icon" aria-hidden>
                      <IconMail size={20} />
                    </span>
                    <div>
                      <strong>Email support</strong>
                      <p>Send us your question — we typically reply within one business day.</p>
                    </div>
                  </div>
                  <button type="button" className="sx-help-email-btn" onClick={() => void handleChannel("EMAIL")}>
                    <IconMail size={16} />
                    Send email
                  </button>
                  {!auth.user ? (
                    <p className="sx-help-auth-hint">Sign in required</p>
                  ) : null}
                </div>

                <div className="sx-help-or-divider" aria-hidden>
                  <span>OR</span>
                </div>

                <div className="sx-help-callback-card">
                  <div className="sx-help-callback-card__head">
                    <span className="sx-help-callback-card__icon" aria-hidden>
                      <IconPhone size={18} />
                    </span>
                    <div>
                      <strong>Request a callback</strong>
                      <span className="sx-help-callback-card__badge">Usually within 1 business day</span>
                    </div>
                  </div>
                  <p className="sx-help-callback-card__desc">
                    Prefer speaking with someone? Tell us your issue and our team will call you back at a time that suits you.
                  </p>
                  <button type="button" className="sx-help-callback-btn" onClick={() => void handleChannel("CALL")}>
                    <IconPhone size={16} />
                    Request call
                  </button>
                  {!auth.user ? (
                    <p className="sx-help-auth-hint">Sign in required</p>
                  ) : null}
                </div>
              </div>
            </aside>
            </section>
          </div>
        </div>
      </div>

      {!aiPanelOpen ? (
        <div className="sx-help-faq-footer-band">
          <div className="sx-help-ai-cta">
            <div className="sx-help-ai-cta__inner">
              <div className="sx-help-ai-cta__text">
                <strong>Couldn&apos;t find what you need?</strong>
                <p>If your issue isn&apos;t listed or the FAQ didn&apos;t solve it, our team can help you directly.</p>
              </div>
              <button type="button" className="sx-help-ai-cta__btn" onClick={openAiPanel}>
                <IconSparkle size={16} />
                Ask AI assistant
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {loginGate.open ? (
        <SupportLoginGateModal
          open={loginGate.open}
          featureLabel={loginGate.feature}
          returnPath={loginGate.returnPath}
          onClose={() => setLoginGate((g) => ({ ...g, open: false }))}
          suggestAi
        />
      ) : null}

      {showAgentConnectModal ? (
        <div className="sx-help-modal-backdrop" role="dialog" aria-labelledby="sx-agent-connect-title">
          <div className="sx-help-modal sx-help-agent-connect-modal">
            <div className="sx-help-agent-connect-modal__icon" aria-hidden>
              <IconLiveChat size={28} />
            </div>
            <h3 id="sx-agent-connect-title">{LIVE_AGENT_CONNECT_MODAL_TITLE}</h3>
            <p>{LIVE_AGENT_CONNECT_MODAL_BODY}</p>
            <div className="sx-help-modal-actions">
              <button
                type="button"
                className="primary"
                onClick={() => void openLiveAgent()}
                disabled={liveLoading}
              >
                {liveLoading ? "Connecting…" : LIVE_AGENT_OFFER_PRIMARY_LABEL}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAgentConnectModal(false);
                  setShowInChatAgentOffer(false);
                  setAgentOfferDismissed(true);
                }}
              >
                {LIVE_AGENT_OFFER_DISMISS_LABEL}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {noAgentModal ? (
        <div className="sx-help-modal-backdrop">
          <div className="sx-help-modal">
            <h3>No agent available</h3>
            <p>No live agent is available right now. Please try again later or create a support ticket.</p>
            <button type="button" className="primary" onClick={() => setNoAgentModal(false)}>
              OK
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
