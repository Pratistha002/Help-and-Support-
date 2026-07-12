import faqSeed from "@/data/support-faqs.json";

export type FaqChip = {
  id: string;
  consumerType: string;
  question: string;
  answer: string;
  category: string;
};

const faqs = (faqSeed as Omit<FaqChip, "id">[]).map((f, i) => ({
  ...f,
  id: `faq-${i + 1}`,
}));

/** Maps service chip ids (CHAT_SERVICES_BY_ROLE) to FAQ categories in support-faqs.json */
const SERVICE_CATEGORY_MAP: Record<string, string[]> = {
  profile: ["Account & Login", "Notifications"],
  talentx: ["TalentX & Role Prep"],
  "skill-test": ["Skill Tests"],
  interviewx: ["InterviewX"],
  dashboard: ["Manager Dashboard", "Account & Login"],
  invite: ["Bulk Invites"],
  recommend: ["Role Recommendations"],
  analytics: ["Analytics"],
  "hr-view": ["HR View"],
  "invite-hr": ["Bulk Invites"],
  engagement: ["Engagement"],
  org: ["Org Structure"],
  admin: ["Admin Access"],
  docker: ["Docker & Deploy", "Data & Seeding"],
  api: ["Technical Support"],
  "help-desk": ["Help & Support"],
};

const GENERIC_CATEGORIES = [
  "Account & Login",
  "Technical Support",
  "Payments & Billing",
  "Notifications",
];

export function getFaqsForRole(consumerType: string): FaqChip[] {
  return faqs.filter((f) => f.consumerType === consumerType);
}

export function getFaqsForService(consumerType: string, serviceId: string, limit = 5): FaqChip[] {
  const categories = SERVICE_CATEGORY_MAP[serviceId] || [];
  if (!categories.length) return [];
  return getFaqsForRole(consumerType)
    .filter((f) => categories.some((c) => f.category === c))
    .slice(0, limit);
}

/** Cross-cutting FAQ chips shown on the role welcome screen */
export function getGenericFaqChips(consumerType: string, limit = 3): FaqChip[] {
  return getFaqsForRole(consumerType)
    .filter((f) => GENERIC_CATEGORIES.includes(f.category))
    .slice(0, limit);
}

export function getRoleWelcomeCopy(role: string): string {
  const map: Record<string, string> = {
    EMPLOYEE:
      "Choose a topic below — TalentX role prep, skill tests, InterviewX, or account help — or type your question.",
    MANAGER:
      "Choose a topic below — team dashboard, bulk invites, role recommendations, analytics — or type your question.",
    HR: "Choose a topic below — company-wide view, cross-department invites, engagement, or org structure — or type your question.",
    ADMIN:
      "Choose a topic below — admin panel, deployment, API issues, or help desk — or type your question.",
  };
  return map[role] || map.EMPLOYEE;
}
