/**
 * Predefined support topics with customer-friendly step-by-step answers.
 * Shared by AI chat (server) and quick-topic chips (client).
 */

export type AiGuide = {
  id: string;
  /** Short label for quick-topic chip */
  label: string;
  /** Message sent when user taps the chip */
  prompt: string;
  /** EMPLOYEE | MANAGER | HR | ADMIN — omit or use ALL for everyone */
  roles: string[];
  /** Match when any pattern hits user message */
  patterns: RegExp[];
  answer: string;
};

const ALL_ROLES = ["EMPLOYEE", "MANAGER", "HR", "ADMIN"];

export const AI_GUIDES: AiGuide[] = [
  {
    id: "login",
    label: "Can't log in",
    prompt: "I'm not able to log in",
    roles: ALL_ROLES,
    patterns: [
      /\b(not able to|unable to|can't|cannot|won't)\s*(log ?in|login|sign in)\b/i,
      /\b(login|sign in)\s*(not working|issue|problem|failed|error)\b/i,
      /\bcan't access my account\b/i,
    ],
    answer: `Here’s how to sign in again:

1. Go to the correct login page for your role (Employee, Manager/HR, or Admin).
2. Enter the email your company registered for you — usually your work email.
3. Enter your password carefully (check Caps Lock).
4. If this is your first time, use the temporary password from your invite email, then set a new password when prompted.
5. Complete your profile if the system asks — this is required before you can use TalentX.

Still stuck? Ask your manager or HR to confirm your account is active, or connect with a live agent below.`,
  },
  {
    id: "password",
    label: "Forgot password",
    prompt: "I forgot my password",
    roles: ALL_ROLES,
    patterns: [
      /\b(forgot|forget|reset|change)\s*(my\s*)?(password|passwd)\b/i,
      /\bpassword\s*(reset|recovery|help)\b/i,
    ],
    answer: `To reset or recover your password:

1. On the login page, look for **Forgot password** (if your company has it enabled).
2. Enter your registered email and follow the link or OTP sent to your inbox (check spam/junk).
3. If you were invited by your manager, you may need a new invite — ask your manager or HR to resend it.
4. After resetting, sign in and update your profile if asked.

If you never received an email, contact your manager or HR with the email address that should be on file.`,
  },
  {
    id: "refund",
    label: "Refund timing",
    prompt: "When will I get a refund?",
    roles: ALL_ROLES,
    patterns: [
      /\b(refund|money back|reimburse|chargeback)\b/i,
      /\bwhen.*(refund|money|payment)\b/i,
      /\bpaid.*(twice|wrong|mistake)\b/i,
    ],
    answer: `About refunds and payments:

• **TalentX workforce access** is usually provided by your employer — individual employees typically do not pay directly.
• If you paid for a **course, assessment, or third-party service** through SaarthiX, refund rules depend on that product’s policy.
• Refunds, if approved, usually take **5–10 business days** to appear on your original payment method (banks may take longer).

What to do:
1. Note your payment date, amount, and receipt or transaction reference.
2. Contact your **HR or company admin** if the charge was employer-related.
3. For product-specific billing, create a support ticket or chat with a live agent with your receipt — our team will confirm eligibility and timeline.`,
  },
  {
    id: "report",
    label: "Can't get my report",
    prompt: "I'm not able to generate or download my report",
    roles: ["EMPLOYEE", "MANAGER", "HR", "ADMIN"],
    patterns: [
      /\b(not able to|unable to|can't|cannot)\s*(generate|download|export|view|see|get).*(report|analytics|progress|certificate)\b/i,
      /\b(report|analytics|progress report|certificate)\s*(not working|missing|empty|failed|issue)\b/i,
      /\bdownload.*(report|certificate|analytics)\b/i,
    ],
    answer: `To view or download your report / progress summary:

**Employees**
1. Open **TalentX** from your home dashboard.
2. Go to your active **target role** or **skill tests** section.
3. Open completed tests or role progress — scores and status appear there.
4. Use your browser’s print or save option if you need a PDF snapshot.

**Managers & HR**
1. Open your **team dashboard**.
2. Find the employee or department, then click **Track** or **Analytics** on their role.
3. Reports open in a new view — wait for the page to finish loading.
4. If the list is empty, the employee may not have started prep yet.

If the page stays blank, try another browser, refresh once, or sign out and back in. For a formal document, connect with a live agent.`,
  },
  {
    id: "skill-test",
    label: "Skill test issue",
    prompt: "My skill test is not working",
    roles: ["EMPLOYEE", "MANAGER"],
    patterns: [
      /\b(skill test|assessment|quiz)\s*(not working|failed|stuck|frozen|error)\b/i,
      /\b(can't|cannot|unable to)\s*(start|submit|take).*(test|assessment|quiz)\b/i,
    ],
    answer: `If a skill test isn’t working:

1. Make sure you’re on your **active role** in TalentX and the skill is unlocked in your plan.
2. Use a stable internet connection and refresh the page once.
3. To **submit**, answer all required questions and click Submit — don’t close the tab early.

If you **failed** the test:
1. Review the learning topics on your TalentX role plan (Gantt / timeline).
2. Open the skill again and click **Retake test** when available.
3. You need at least **80%** to pass.
4. Check your **Detailed report** for areas to practice.

If the test won’t start or submit after retrying, note the skill name and any error message, then chat with a live agent.`,
  },
  {
    id: "profile",
    label: "Complete my profile",
    prompt: "Why do I need to complete my profile?",
    roles: ["EMPLOYEE", "MANAGER", "HR"],
    patterns: [
      /\b(complete|finish|fill)\s*(my\s*)?profile\b/i,
      /\bprofile\s*(completion|required|setup|incomplete)\b/i,
      /\bfirst login|new account setup\b/i,
    ],
    answer: `You're asked to complete your profile only if a manager or HR invited you.

When you're invited, a basic account is created with just your name, email, and a temporary password. On first login, you need to:

1. Set a **permanent password**.
2. Fill in required fields such as designation and department.
3. Save and continue — then you can use TalentX or InterviewX.

If you signed up yourself through the registration form, your profile is already complete and you won't see this step.`,
  },
  {
    id: "invite",
    label: "Didn't get invite email",
    prompt: "I didn't receive my invite email",
    roles: ["EMPLOYEE", "MANAGER", "HR"],
    patterns: [
      /\b(invite|invitation)\s*(email|mail)?\s*(not received|missing|didn't get|never got)\b/i,
      /\bdidn't receive.*(invite|email|password)\b/i,
      /\bbulk invite.*(fail|error|issue)\b/i,
    ],
    answer: `If you didn’t receive an invite email:

**Employees**
1. Check spam, junk, and promotions folders.
2. Confirm with your manager that they used the **correct email address** for you.
3. Ask them to **resend the invite** from the manager dashboard.

**Managers / HR**
1. After bulk upload, review the **success and error list** shown on screen.
2. Fix any rows with invalid emails and upload again.
3. Ensure each row has **Email** and **Name** (HR also needs **Department**).

Invites can take a few minutes. If it’s been over an hour, contact support with the email address used.`,
  },
  {
    id: "interviewx",
    label: "Open InterviewX",
    prompt: "How do I access InterviewX?",
    roles: ["EMPLOYEE", "MANAGER"],
    patterns: [
      /\b(interviewx|interview prep|mock interview)\s*(access|open|link|not working)?\b/i,
      /\bhow.*(access|open|use).*(interview)\b/i,
    ],
    answer: `To use InterviewX interview preparation:

1. Sign in to your **Employee** account.
2. From the home hub, click **InterviewX**.
3. Interview prep opens in a new tab with your name and email already filled in.
4. Choose a practice flow or mock interview as shown on screen.

If the page doesn’t open, allow pop-ups for this site in your browser, or try Chrome/Edge. Still blocked? Chat with a live agent.`,
  },
  {
    id: "page-loading",
    label: "Page not loading",
    prompt: "The page is blank or not loading",
    roles: ALL_ROLES,
    patterns: [
      /\b(blank|white)\s*(screen|page)\b/i,
      /\bpage\s*(not loading|won't load|stuck|frozen)\b/i,
      /\bsite\s*(down|not working)\b/i,
    ],
    answer: `If a page looks blank or won’t load:

1. **Refresh** the page once (F5 or the refresh button).
2. Try **another browser** (Chrome or Edge work best).
3. Sign **out and sign back in**.
4. Check your internet connection.
5. Clear only this site’s cache if you know how — otherwise skip this step.

Tell us **which page** you were opening (e.g. TalentX, skill test, dashboard) if you need a live agent to help further.`,
  },
  {
    id: "manager-invite",
    label: "Bulk invite help",
    prompt: "How do I invite employees in bulk?",
    roles: ["MANAGER", "HR"],
    patterns: [
      /\b(bulk|excel|upload)\s*invite\b/i,
      /\binvite employees\b/i,
      /\bhow.*invite.*(team|employees|staff)\b/i,
    ],
    answer: `To invite employees in bulk:

1. Open your **Manager or HR dashboard**.
2. Choose **Invite employees from Excel** (or similar).
3. **Download the template** and fill in at least **Email** and **Name**.
4. HR uploads also need **Department** for each row.
5. Upload the file and review the on-screen **success and error summary**.

Each new person gets an email with a temporary password and must complete their profile on first login.`,
  },
];

const GENERAL_TOPIC_IDS = ["login", "password", "profile", "invite", "refund", "report", "page-loading"] as const;

const PLATFORM_GUIDE_IDS = ["skill-test", "interviewx", "manager-invite"] as const;

function pickGuidesByIds(role: string, ids: readonly string[]): Pick<AiGuide, "id" | "label" | "prompt">[] {
  const r = role || "EMPLOYEE";
  const byId = new Map(
    AI_GUIDES.filter((g) => g.roles.includes(r) || g.roles.includes("ALL")).map((g) => [g.id, g]),
  );
  const picked: Pick<AiGuide, "id" | "label" | "prompt">[] = [];
  for (const id of ids) {
    const g = byId.get(id);
    if (g) picked.push({ id: g.id, label: g.label, prompt: g.prompt });
  }
  return picked;
}

/** Step 1 — account, login, billing, reports (shown first in chat onboarding) */
export function getGeneralTopicsForRole(role: string): Pick<AiGuide, "id" | "label" | "prompt">[] {
  return pickGuidesByIds(role, GENERAL_TOPIC_IDS);
}

/** Extra platform FAQ chips (merged with CHAT_SERVICES in step 2) */
export function getPlatformGuideTopicsForRole(role: string): Pick<AiGuide, "id" | "label" | "prompt">[] {
  return pickGuidesByIds(role, PLATFORM_GUIDE_IDS);
}

/** Quick-topic chips per role (subset of guides relevant to that role) */
export function getQuickTopicsForRole(role: string): Pick<AiGuide, "id" | "label" | "prompt">[] {
  const r = role || "EMPLOYEE";
  const order = [
    "login",
    "password",
    "profile",
    "report",
    "refund",
    "skill-test",
    "invite",
    "interviewx",
    "page-loading",
    "manager-invite",
  ];
  const guides = AI_GUIDES.filter((g) => g.roles.includes(r) || g.roles.includes("ALL"));
  const byId = new Map(guides.map((g) => [g.id, g]));
  const picked: Pick<AiGuide, "id" | "label" | "prompt">[] = [];
  for (const id of order) {
    const g = byId.get(id);
    if (g) picked.push({ id: g.id, label: g.label, prompt: g.prompt });
  }
  return picked.slice(0, 6);
}

export function findGuideMatch(consumerType: string, message: string): AiGuide | null {
  const text = message.trim();
  if (!text) return null;
  const role = consumerType || "EMPLOYEE";
  let best: AiGuide | null = null;
  let bestScore = 0;

  for (const guide of AI_GUIDES) {
    if (!guide.roles.includes(role) && !guide.roles.includes("ALL")) continue;
    let score = 0;
    for (const pat of guide.patterns) {
      if (pat.test(text)) score += 10;
    }
    // Exact prompt match from quick chip
    if (guide.prompt.toLowerCase() === text.toLowerCase()) score += 20;
    if (score > bestScore) {
      bestScore = score;
      best = guide;
    }
  }
  return bestScore >= 10 ? best : null;
}

const TECHNICAL_JARGON =
  /\b(jwt|oauth|api\s|endpoint|docker|mongodb|nginx|backend|frontend|401|403|500|webhook|container|localhost|ctrl\+f5|sso|bearer|token expired|env file|spring|compile)\b/i;

const TOPIC_KEYWORDS: Record<string, string[]> = {
  login: ["login", "log in", "sign in", "password", "account", "access"],
  refund: ["refund", "payment", "billing", "charge", "money"],
  report: ["report", "analytics", "progress", "certificate", "download", "export"],
  test: ["test", "assessment", "quiz", "skill"],
  invite: ["invite", "invitation", "email"],
  profile: ["profile", "complete", "setup"],
  interview: ["interview", "interviewx"],
  page: ["page", "blank", "load", "loading", "screen"],
};

function detectUserTopics(message: string): string[] {
  const lower = message.toLowerCase();
  const found: string[] = [];
  for (const [topic, words] of Object.entries(TOPIC_KEYWORDS)) {
    if (words.some((w) => lower.includes(w))) found.push(topic);
  }
  return found;
}

function replyAddressesTopics(reply: string, topics: string[]): boolean {
  if (topics.length === 0) return true;
  const lower = reply.toLowerCase();
  for (const topic of topics) {
    const words = TOPIC_KEYWORDS[topic] || [];
    if (words.some((w) => lower.includes(w))) return true;
  }
  return false;
}

/** True when OpenAI reply is off-topic, too technical, or doesn't help the customer */
export function isIrrelevantOrUnhelpfulReply(userMessage: string, reply: string): boolean {
  if (!reply?.trim()) return true;
  if (TECHNICAL_JARGON.test(reply)) return true;

  const topics = detectUserTopics(userMessage);
  if (topics.length > 0 && !replyAddressesTopics(reply, topics)) return true;

  const r = reply.toLowerCase();
  const genericOnly =
    reply.length < 120 &&
    /\b(contact support|reach out|support team|i'm not sure|don't have enough context)\b/.test(r) &&
    !/\b(1\.|2\.|step|first|try|open|click|go to)\b/.test(r);
  if (genericOnly) return true;

  return false;
}

export function shouldOfferLiveAgent(opts: {
  userMessage: string;
  reply: string;
  matchedFromGuide: boolean;
  matchedFromDb: boolean;
  explicitHandoff?: boolean;
}): boolean {
  if (opts.explicitHandoff || wantsLiveAgent(opts.userMessage)) return true;
  if (opts.matchedFromGuide || opts.matchedFromDb) return false;

  const lower = opts.userMessage.toLowerCase();
  if (/\b(still not|still can't|still unable|doesn't work|didn't work|not helpful|wrong answer)\b/.test(lower)) {
    return true;
  }

  if (isIrrelevantOrUnhelpfulReply(opts.userMessage, opts.reply)) return true;

  const r = opts.reply.toLowerCase();
  if (
    /\b(live agent|couldn't find|don't have enough|unable to resolve|create a support ticket)\b/.test(r) ||
    /\b(if the issue persists|please reach out to support)\b/.test(r)
  ) {
    return true;
  }

  return false;
}

function wantsLiveAgent(message: string): boolean {
  const lower = message.toLowerCase().trim();
  return (
    /\b(live agent|live support|talk to agent|human agent|connect.*agent|live chat)\b/.test(lower) ||
    (/\b(agent|human)\b/.test(lower) && /\b(chat|talk|connect|want|need)\b/.test(lower))
  );
}
