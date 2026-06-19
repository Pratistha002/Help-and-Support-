export type EmployeeRow = {
  employee: {
    _id: string;
    fullName: string;
    email: string;
    designation: string;
    department: string;
    industry: string;
    employeeId: string;
    currentRole: "EMPLOYEE" | "MANAGER" | "HR";
  };
  ongoing: Array<{ roleName: string; pct: number; startedAt?: string | null }>;
  avgPct: number;
  latestTest: {
    roleName?: string;
    skillName?: string;
    score?: number | null;
    passed?: boolean;
    completedAt?: string | null;
  } | null;
};

export type ActivityEvent = {
  type: "TEST_PASSED" | "TEST_FAILED" | "SKILL_COMPLETED" | "PREP_STARTED";
  employeeName: string;
  employeeDepartment?: string;
  roleName?: string;
  skillName?: string;
  score?: number;
  at: string;
};

export type MockActivity = {
  engagement: { total: number; active7d: number; active30d: number; dormant: number };
  activityFeed: ActivityEvent[];
  roleAggregates: Array<{ name: string; learners: number; avgPct: number }>;
  topSkills: Array<{ name: string; attempts: number; passRate: number; avgScore: number | null }>;
};

export const MOCK_MANAGER = {
  fullName: "Priya Sharma",
  email: "priya.sharma@acmecorp.com",
  department: "Engineering",
  industry: "Technology",
  currentRole: "MANAGER" as const,
};

export const MOCK_EMPLOYEE_ROWS: EmployeeRow[] = [
  {
    employee: {
      _id: "e1",
      fullName: "Arjun Mehta",
      email: "arjun.mehta@acmecorp.com",
      designation: "Software Engineer",
      department: "Engineering",
      industry: "Technology",
      employeeId: "EMP-1042",
      currentRole: "EMPLOYEE",
    },
    ongoing: [
      { roleName: "Senior Backend Engineer", pct: 78, startedAt: "2026-03-01" },
      { roleName: "Cloud Architect", pct: 42, startedAt: "2026-04-10" },
    ],
    avgPct: 60,
    latestTest: { roleName: "Senior Backend Engineer", skillName: "System Design", score: 82, passed: true, completedAt: "2026-06-17T10:30:00Z" },
  },
  {
    employee: {
      _id: "e2",
      fullName: "Neha Kapoor",
      email: "neha.kapoor@acmecorp.com",
      designation: "Product Analyst",
      department: "Product",
      industry: "Technology",
      employeeId: "EMP-1088",
      currentRole: "EMPLOYEE",
    },
    ongoing: [{ roleName: "Product Manager", pct: 91, startedAt: "2026-02-15" }],
    avgPct: 91,
    latestTest: { roleName: "Product Manager", skillName: "Stakeholder Management", score: 94, passed: true, completedAt: "2026-06-18T14:00:00Z" },
  },
  {
    employee: {
      _id: "e3",
      fullName: "Rahul Verma",
      email: "rahul.verma@acmecorp.com",
      designation: "QA Engineer",
      department: "Engineering",
      industry: "Technology",
      employeeId: "EMP-1101",
      currentRole: "EMPLOYEE",
    },
    ongoing: [{ roleName: "Test Automation Lead", pct: 55, startedAt: "2026-05-01" }],
    avgPct: 55,
    latestTest: { roleName: "Test Automation Lead", skillName: "Selenium & CI/CD", score: 61, passed: false, completedAt: "2026-06-16T09:15:00Z" },
  },
  {
    employee: {
      _id: "e4",
      fullName: "Sneha Iyer",
      email: "sneha.iyer@acmecorp.com",
      designation: "HR Coordinator",
      department: "Human Resources",
      industry: "Technology",
      employeeId: "EMP-1120",
      currentRole: "EMPLOYEE",
    },
    ongoing: [],
    avgPct: 0,
    latestTest: null,
  },
  {
    employee: {
      _id: "e5",
      fullName: "Vikram Singh",
      email: "vikram.singh@acmecorp.com",
      designation: "DevOps Engineer",
      department: "Engineering",
      industry: "Technology",
      employeeId: "EMP-1135",
      currentRole: "EMPLOYEE",
    },
    ongoing: [{ roleName: "Platform Engineer", pct: 33, startedAt: "2026-05-20" }],
    avgPct: 33,
    latestTest: { roleName: "Platform Engineer", skillName: "Kubernetes", score: 48, passed: false, completedAt: "2026-06-14T16:45:00Z" },
  },
  {
    employee: {
      _id: "e6",
      fullName: "Ananya Das",
      email: "ananya.das@acmecorp.com",
      designation: "UX Designer",
      department: "Design",
      industry: "Technology",
      employeeId: "EMP-1148",
      currentRole: "EMPLOYEE",
    },
    ongoing: [{ roleName: "Senior UX Designer", pct: 67, startedAt: "2026-04-05" }],
    avgPct: 67,
    latestTest: { roleName: "Senior UX Designer", skillName: "Design Systems", score: 74, passed: true, completedAt: "2026-06-15T11:20:00Z" },
  },
  {
    employee: {
      _id: "e7",
      fullName: "Karan Malhotra",
      email: "karan.malhotra@acmecorp.com",
      designation: "Sales Executive",
      department: "Sales",
      industry: "Technology",
      employeeId: "EMP-1160",
      currentRole: "EMPLOYEE",
    },
    ongoing: [],
    avgPct: 0,
    latestTest: null,
  },
  {
    employee: {
      _id: "e8",
      fullName: "Divya Nair",
      email: "divya.nair@acmecorp.com",
      designation: "Data Analyst",
      department: "Analytics",
      industry: "Technology",
      employeeId: "EMP-1172",
      currentRole: "EMPLOYEE",
    },
    ongoing: [
      { roleName: "Data Scientist", pct: 84, startedAt: "2026-01-20" },
    ],
    avgPct: 84,
    latestTest: { roleName: "Data Scientist", skillName: "Machine Learning", score: 88, passed: true, completedAt: "2026-06-18T08:00:00Z" },
  },
  {
    employee: {
      _id: "e9",
      fullName: "Mohit Jain",
      email: "mohit.jain@acmecorp.com",
      designation: "Engineering Manager",
      department: "Engineering",
      industry: "Technology",
      employeeId: "EMP-1185",
      currentRole: "MANAGER",
    },
    ongoing: [{ roleName: "Director of Engineering", pct: 72, startedAt: "2026-03-12" }],
    avgPct: 72,
    latestTest: { roleName: "Director of Engineering", skillName: "Leadership & Strategy", score: 79, passed: true, completedAt: "2026-06-12T13:30:00Z" },
  },
  {
    employee: {
      _id: "e10",
      fullName: "Pooja Reddy",
      email: "pooja.reddy@acmecorp.com",
      designation: "Marketing Specialist",
      department: "Marketing",
      industry: "Technology",
      employeeId: "EMP-1198",
      currentRole: "EMPLOYEE",
    },
    ongoing: [{ roleName: "Growth Marketing Lead", pct: 18, startedAt: "2026-06-01" }],
    avgPct: 18,
    latestTest: { roleName: "Growth Marketing Lead", skillName: "Campaign Analytics", score: 35, passed: false, completedAt: "2026-06-10T17:00:00Z" },
  },
];

export const MOCK_ACTIVITY: MockActivity = {
  engagement: { total: 10, active7d: 7, active30d: 9, dormant: 1 },
  activityFeed: [
    { type: "TEST_PASSED", employeeName: "Neha Kapoor", employeeDepartment: "Product", roleName: "Product Manager", skillName: "Stakeholder Management", score: 94, at: "2026-06-18T14:00:00Z" },
    { type: "TEST_PASSED", employeeName: "Divya Nair", employeeDepartment: "Analytics", roleName: "Data Scientist", skillName: "Machine Learning", score: 88, at: "2026-06-18T08:00:00Z" },
    { type: "TEST_PASSED", employeeName: "Arjun Mehta", employeeDepartment: "Engineering", roleName: "Senior Backend Engineer", skillName: "System Design", score: 82, at: "2026-06-17T10:30:00Z" },
    { type: "TEST_FAILED", employeeName: "Rahul Verma", employeeDepartment: "Engineering", roleName: "Test Automation Lead", skillName: "Selenium & CI/CD", score: 61, at: "2026-06-16T09:15:00Z" },
    { type: "SKILL_COMPLETED", employeeName: "Ananya Das", employeeDepartment: "Design", roleName: "Senior UX Designer", skillName: "User Research", at: "2026-06-15T11:00:00Z" },
    { type: "PREP_STARTED", employeeName: "Pooja Reddy", employeeDepartment: "Marketing", roleName: "Growth Marketing Lead", at: "2026-06-01T09:00:00Z" },
    { type: "TEST_FAILED", employeeName: "Vikram Singh", employeeDepartment: "Engineering", roleName: "Platform Engineer", skillName: "Kubernetes", score: 48, at: "2026-06-14T16:45:00Z" },
  ],
  roleAggregates: [
    { name: "Senior Backend Engineer", learners: 1, avgPct: 78 },
    { name: "Product Manager", learners: 1, avgPct: 91 },
    { name: "Data Scientist", learners: 1, avgPct: 84 },
    { name: "Test Automation Lead", learners: 1, avgPct: 55 },
    { name: "Platform Engineer", learners: 1, avgPct: 33 },
    { name: "Senior UX Designer", learners: 1, avgPct: 67 },
  ],
  topSkills: [
    { name: "System Design", attempts: 12, passRate: 75, avgScore: 78 },
    { name: "Machine Learning", attempts: 9, passRate: 67, avgScore: 72 },
    { name: "Stakeholder Management", attempts: 8, passRate: 88, avgScore: 85 },
    { name: "Kubernetes", attempts: 7, passRate: 43, avgScore: 52 },
  ],
};

export function computeStats(rows: EmployeeRow[]) {
  const total = rows.length;
  const active = rows.filter((r) => Array.isArray(r.ongoing) && r.ongoing.length > 0);
  const activeCount = active.length;
  const activePct = total > 0 ? Math.round((activeCount / total) * 100) : 0;
  const avgProgress =
    activeCount > 0 ? Math.round(active.reduce((s, r) => s + (r.avgPct || 0), 0) / activeCount) : 0;

  const scores: number[] = [];
  for (const r of rows) {
    const sc = r.latestTest?.score;
    if (typeof sc === "number") scores.push(sc);
  }
  const avgScore = scores.length ? Math.round(scores.reduce((s, x) => s + x, 0) / scores.length) : null;

  const buckets = [
    { label: "0–25%", count: 0, color: "#ef4444" },
    { label: "25–50%", count: 0, color: "#f59e0b" },
    { label: "50–75%", count: 0, color: "#0b5fe8" },
    { label: "75–100%", count: 0, color: "#16a34a" },
  ];
  for (const r of active) {
    const p = r.avgPct || 0;
    if (p < 25) buckets[0].count += 1;
    else if (p < 50) buckets[1].count += 1;
    else if (p < 75) buckets[2].count += 1;
    else buckets[3].count += 1;
  }

  return { total, active: activeCount, activePct, avgProgress, avgScore, testCount: scores.length, buckets };
}
