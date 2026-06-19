"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MOCK_ACTIVITY,
  MOCK_EMPLOYEE_ROWS,
  MOCK_MANAGER,
  computeStats,
  type ActivityEvent,
  type EmployeeRow,
  type MockActivity,
} from "@/lib/mockData";

const fade = { opacity: 0, y: 22 };
const fadeIn = { opacity: 1, y: 0 };
const EMPLOYEE_TABLE_PREVIEW_ROWS = 8;
const ACTIVITY_FEED_PREVIEW = 5;
const LEADERBOARD_PREVIEW = 3;

function cardAccentTop(accent: string): React.CSSProperties {
  return {
    boxShadow: `inset 0 3px 0 0 ${accent}, 0 4px 6px -1px rgba(15,23,42,0.05), 0 14px 44px -22px rgba(15,23,42,0.12)`,
  };
}

export function EmployeeManagementDashboard() {
  const [rows] = useState<EmployeeRow[]>(MOCK_EMPLOYEE_ROWS);
  const [activity] = useState<MockActivity>(MOCK_ACTIVITY);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"MANAGER" | "HR">("MANAGER");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "NOT_STARTED">("ALL");
  const [sortKey, setSortKey] = useState<"NAME" | "PROGRESS_DESC" | "PROGRESS_ASC" | "RECENT_TEST">("PROGRESS_DESC");
  const [industryFilter, setIndustryFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [staffRoleFilter, setStaffRoleFilter] = useState<"ALL" | "EMPLOYEE" | "MANAGER" | "HR">("ALL");
  const [employeeTableExpanded, setEmployeeTableExpanded] = useState(false);

  const [inviteFile, setInviteFile] = useState<File | null>(null);
  const inviteFileInputRef = useRef<HTMLInputElement>(null);
  const [inviteMessage, setInviteMessage] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setLastRefreshed(new Date());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const user = MOCK_MANAGER;
  const isHR = viewMode === "HR";
  const myDepartment = (user.department || "").trim();
  const scopeLabel = isHR
    ? "All departments (HR)"
    : myDepartment
      ? `${myDepartment} department`
      : "Your team";

  const stats = useMemo(() => computeStats(rows), [rows]);

  const filterOptions = useMemo(() => {
    const industries = new Set<string>();
    const departments = new Set<string>();
    for (const r of rows) {
      const e = r.employee;
      if (e.industry) industries.add(e.industry);
      if (e.department) departments.add(e.department);
    }
    return {
      industries: Array.from(industries).sort((a, b) => a.localeCompare(b)),
      departments: Array.from(departments).sort((a, b) => a.localeCompare(b)),
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = rows.filter((r) => {
      const e = r.employee;
      const ongoing = r.ongoing;
      if (statusFilter === "ACTIVE" && ongoing.length === 0) return false;
      if (statusFilter === "NOT_STARTED" && ongoing.length > 0) return false;
      if (isHR) {
        if (industryFilter !== "ALL" && e.industry !== industryFilter) return false;
        if (departmentFilter !== "ALL" && e.department !== departmentFilter) return false;
        if (staffRoleFilter !== "ALL" && e.currentRole !== staffRoleFilter) return false;
      } else if (e.department !== myDepartment) {
        return false;
      }
      if (!q) return true;
      const hay = [e.fullName, e.email, e.designation, e.department, e.employeeId]
        .map((x) => String(x || "").toLowerCase())
        .join(" ");
      return hay.includes(q);
    });

    out = out.slice().sort((a, b) => {
      switch (sortKey) {
        case "NAME":
          return a.employee.fullName.localeCompare(b.employee.fullName);
        case "PROGRESS_ASC":
          return (a.avgPct || 0) - (b.avgPct || 0);
        case "RECENT_TEST": {
          const ad = a.latestTest?.completedAt ? new Date(a.latestTest.completedAt).getTime() : 0;
          const bd = b.latestTest?.completedAt ? new Date(b.latestTest.completedAt).getTime() : 0;
          return bd - ad;
        }
        case "PROGRESS_DESC":
        default:
          return (b.avgPct || 0) - (a.avgPct || 0);
      }
    });

    return out;
  }, [rows, query, statusFilter, sortKey, isHR, industryFilter, departmentFilter, staffRoleFilter, myDepartment]);

  const visibleEmployeeRows = useMemo(() => {
    if (employeeTableExpanded) return filteredRows;
    return filteredRows.slice(0, EMPLOYEE_TABLE_PREVIEW_ROWS);
  }, [filteredRows, employeeTableExpanded]);

  const employeeTableHiddenCount = Math.max(0, filteredRows.length - EMPLOYEE_TABLE_PREVIEW_ROWS);

  useEffect(() => {
    setEmployeeTableExpanded(false);
  }, [query, statusFilter, sortKey, viewMode]);

  const firstName = user.fullName.split(/\s+/)[0] || "there";
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();
  const initials = (() => {
    const parts = user.fullName.split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
  })();

  const handleRefresh = () => {
    setLastRefreshed(new Date());
    setToast("Dashboard refreshed (UI preview — data is static mock)");
  };

  const handleInviteUpload = () => {
    if (!inviteFile) return;
    setInviteMessage(`UI preview: "${inviteFile.name}" selected. In production, this would create accounts and send invite emails.`);
    setToast("Invite upload simulated — connect backend to enable");
  };

  return (
    <div style={wrap}>
      {toast ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={toastStyle}
        >
          {toast}
        </motion.div>
      ) : null}

      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -1,
          background:
            "radial-gradient(900px 500px at 100% -10%, rgba(99,102,241,0.07), transparent 60%), radial-gradient(700px 400px at -10% 10%, rgba(14,165,233,0.06), transparent 60%), linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
          pointerEvents: "none",
        }}
      />

      <motion.div initial={fade} animate={fadeIn} transition={{ duration: 0.5 }} style={banner}>
        <div style={blobA} />
        <div style={blobB} />
        <div
          style={{
            position: "relative",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 14,
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: "1 1 240px" }}>
            <div style={iconTile}>{initials}</div>
            <div style={{ minWidth: 0 }}>
              <div style={breadcrumb}>
                <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: 700, fontSize: 12 }}>Help & Support</span>
                <span style={crumbSep}>›</span>
                <span style={crumbCur}>Employee Management</span>
                <span style={crumbSep}>›</span>
                <span style={crumbCur}>{isHR ? "HR view" : "Manager view"}</span>
              </div>
              <h1 style={bannerTitle}>
                {greeting}, <span style={{ color: "#fef3c7" }}>{firstName}</span> <span style={{ marginLeft: 4 }}>👋</span>
              </h1>
              <div style={bannerSub}>
                Monitoring dashboard · Viewing <b style={{ color: "#fff" }}>{scopeLabel}</b>
                <span style={{ opacity: 0.6 }}>
                  {" "}
                  · {stats.total} employees · {stats.active} actively preparing
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.28)" }}>
              <button
                type="button"
                onClick={() => setViewMode("MANAGER")}
                style={{
                  ...viewToggleBtn,
                  background: viewMode === "MANAGER" ? "#fff" : "rgba(255,255,255,0.12)",
                  color: viewMode === "MANAGER" ? "#0f172a" : "#fff",
                }}
              >
                Manager
              </button>
              <button
                type="button"
                onClick={() => setViewMode("HR")}
                style={{
                  ...viewToggleBtn,
                  background: viewMode === "HR" ? "#fff" : "rgba(255,255,255,0.12)",
                  color: viewMode === "HR" ? "#0f172a" : "#fff",
                }}
              >
                HR
              </button>
            </div>
            {lastRefreshed ? (
              <span style={chipLive}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
                Live · {lastRefreshed.toLocaleTimeString()}
              </span>
            ) : null}
            <button type="button" onClick={handleRefresh} style={btnSolid}>
              ↻ Refresh
            </button>
          </div>
        </div>
      </motion.div>

      <div className="manager-kpi-grid">
        <KpiCard label="Employees" value={String(stats.total)} hint={isHR ? "All departments" : "Your department"} icon="👥" accent="#3b82f6" />
        <KpiCard label="Actively preparing" value={`${stats.active}`} hint={`${stats.activePct}% of team`} icon="🔥" accent="#16a34a" />
        <KpiCard label="Average progress" value={`${stats.avgProgress}%`} hint="Across active prep plans" icon="📈" accent="#8b5cf6" />
        <KpiCard label="Avg. test score" value={stats.avgScore == null ? "—" : `${stats.avgScore}%`} hint={`${stats.testCount} tests recorded`} icon="🎯" accent="#f97316" />
      </div>

      <div className="manager-two-col">
        <div className="manager-dash-card" style={{ ...cardElevated, ...cardAccentTop("#6366f1"), minWidth: 0 }}>
          <div style={cardTitle}>
            <span style={titleIcon("#6366f1")}>📊</span>Progress distribution
          </div>
          <div style={cardSub}>How active learners are spread across progress bands.</div>
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {stats.buckets.map((b) => (
              <BucketBar key={b.label} label={b.label} count={b.count} total={Math.max(stats.active, 1)} color={b.color} />
            ))}
            {stats.active === 0 ? <div style={emptyHint}>No active learners yet.</div> : null}
          </div>
        </div>

        <div className="manager-dash-card" style={{ ...cardElevated, ...cardAccentTop("#3b82f6"), minWidth: 0 }}>
          <div style={cardTitle}>
            <span style={titleIcon("#3b82f6")}>{isHR ? "🏢" : "🏆"}</span>
            {isHR ? "Department comparison" : "Top vs. lagging in your team"}
          </div>
          <div style={cardSub}>
            {isHR ? "Average preparation progress per department." : "Quickly spot top performers and those who need a nudge."}
          </div>
          {isHR ? <DepartmentCompare rows={filteredRows} /> : <TopVsLagging rows={filteredRows} />}
        </div>
      </div>

      <EngagementStrip activity={activity} />

      <div className="manager-two-col">
        <div className="manager-dash-card" style={{ ...cardElevated, ...cardAccentTop("#10b981"), minWidth: 0 }}>
          <div style={cardTitle}>
            <span style={titleIcon("#10b981")}>📤</span>Invite employees from Excel
          </div>
          <div style={cardSub}>
            Upload a spreadsheet with <b>Email</b> and <b>Name</b> columns.
            {isHR ? (
              <> Each row must also include a <b>Department</b> column.</>
            ) : (
              <> New accounts are created in <b>{myDepartment || "your"}</b> department.</>
            )}{" "}
            <span style={{ color: "#94a3b8" }}>(UI preview — no upload in this demo)</span>
          </div>
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <label className="manager-file-zone" style={{ position: "relative" }}>
              <input
                ref={inviteFileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  setInviteMessage("");
                  setInviteFile(e.target.files?.[0] || null);
                }}
              />
              <span style={{ fontSize: 22 }}>📎</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontWeight: 800, fontSize: 13 }}>
                  {inviteFile ? inviteFile.name : "Choose Excel file"}
                </span>
                <span style={{ display: "block", fontSize: 12, color: "#64748b", marginTop: 2 }}>
                  {inviteFile ? `${(inviteFile.size / 1024).toFixed(1)} KB · click to replace` : ".xlsx or .xls · drag & drop or click"}
                </span>
              </span>
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <button
                type="button"
                disabled={!inviteFile}
                onClick={handleInviteUpload}
                style={{
                  ...btnInvitePrimary,
                  opacity: !inviteFile ? 0.55 : 1,
                  cursor: !inviteFile ? "not-allowed" : "pointer",
                }}
              >
                Upload & invite
              </button>
              {inviteFile ? (
                <button
                  type="button"
                  onClick={() => {
                    setInviteFile(null);
                    setInviteMessage("");
                    if (inviteFileInputRef.current) inviteFileInputRef.current.value = "";
                  }}
                  style={btnInviteSecondary}
                >
                  Clear file
                </button>
              ) : null}
            </div>
          </div>
          {inviteMessage ? <div style={{ ...successStyle, marginTop: 12 }}>{inviteMessage}</div> : null}
        </div>

        <div className="manager-dash-card" style={{ ...cardElevated, ...cardAccentTop("#0ea5e9"), minWidth: 0 }}>
          <div style={cardTitle}>
            <span style={titleIcon("#0ea5e9")}>📅</span>Schedule interview
          </div>
          <div style={cardSub}>
            View everyone in <b>{scopeLabel}</b> with department, email, and roles they&apos;re preparing for.
          </div>
          <div style={{ marginTop: 18 }}>
            <button
              type="button"
              onClick={() => setToast("Schedule hub — UI preview only")}
              style={btnScheduleHub}
            >
              <span style={{ fontSize: 16 }}>🗓</span> Open schedule hub
            </button>
          </div>
        </div>
      </div>

      <div className="manager-two-col">
        <div className="manager-dash-card" style={{ ...cardElevated, ...cardAccentTop("#db2777"), minWidth: 0 }}>
          <div style={cardTitle}>
            <span style={titleIcon("#db2777")}>⚡</span>Live activity feed
          </div>
          <div style={cardSub}>Latest preparation actions and test results.</div>
          <ActivityFeed feed={activity.activityFeed} />
        </div>

        <div className="manager-dash-card" style={{ ...cardElevated, ...cardAccentTop("#7c3aed"), minWidth: 0 }}>
          <div style={cardTitle}>
            <span style={titleIcon("#7c3aed")}>🎯</span>Roles being prepared for
          </div>
          <div style={cardSub}>How many active learners per role, and how far along they are.</div>
          <RoleAggregateChart items={activity.roleAggregates} />
        </div>
      </div>

      <div className="manager-dash-card" style={{ ...cardElevated, ...cardAccentTop("#6366f1"), minWidth: 0 }}>
        <div style={cardTitle}>
          <span style={titleIcon("#6366f1")}>👥</span>Employee preparation database
        </div>
        <div style={toolbar}>
          <input
            className="manager-toolbar-field"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, designation…"
            style={{ ...inputStyle, width: "100%" }}
          />
          {isHR ? (
            <>
              <select className="manager-toolbar-field" value={industryFilter} onChange={(e) => setIndustryFilter(e.target.value)} style={inputStyle}>
                <option value="ALL">All industries</option>
                {filterOptions.industries.map((x) => (
                  <option key={x} value={x}>{x}</option>
                ))}
              </select>
              <select className="manager-toolbar-field" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} style={inputStyle}>
                <option value="ALL">All departments</option>
                {filterOptions.departments.map((x) => (
                  <option key={x} value={x}>{x}</option>
                ))}
              </select>
              <select
                className="manager-toolbar-field"
                value={staffRoleFilter}
                onChange={(e) => setStaffRoleFilter(e.target.value as typeof staffRoleFilter)}
                style={inputStyle}
              >
                <option value="ALL">Employee + Manager</option>
                <option value="EMPLOYEE">Employees only</option>
                <option value="MANAGER">Managers only</option>
                <option value="HR">HR only</option>
              </select>
            </>
          ) : null}
          <select className="manager-toolbar-field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} style={inputStyle}>
            <option value="ALL">All employees</option>
            <option value="ACTIVE">Actively preparing</option>
            <option value="NOT_STARTED">Not started</option>
          </select>
          <select className="manager-toolbar-field" value={sortKey} onChange={(e) => setSortKey(e.target.value as typeof sortKey)} style={inputStyle}>
            <option value="PROGRESS_DESC">Sort: progress (high → low)</option>
            <option value="PROGRESS_ASC">Sort: progress (low → high)</option>
            <option value="NAME">Sort: name (A → Z)</option>
            <option value="RECENT_TEST">Sort: recent test</option>
          </select>
        </div>

        <div style={tableWrap}>
          <table style={employeeTableStyle}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Employee", "Department", "Designation", "Active prep", "Avg progress", "Latest test", "Track", "Recommend"].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleEmployeeRows.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 14, color: "#64748b" }}>
                    No employees match the current filters.
                  </td>
                </tr>
              ) : (
                visibleEmployeeRows.map((r) => {
                  const e = r.employee;
                  const ongoing = r.ongoing;
                  const latest = r.latestTest;
                  const pick = ongoing.slice(0, 2);
                  const more = Math.max(0, ongoing.length - pick.length);
                  return (
                    <tr key={e._id}>
                      <td style={td}>
                        <div style={{ fontWeight: 800 }}>{e.fullName}</div>
                        <div style={{ color: "#64748b", fontSize: 12 }}>{e.email}</div>
                      </td>
                      <td style={td}>{e.department || "—"}</td>
                      <td style={td}>{e.designation || "—"}</td>
                      <td style={td}>{ongoing.length ? `${ongoing.length} role(s)` : <span style={{ color: "#94a3b8" }}>None</span>}</td>
                      <td style={td}>{ongoing.length ? <ProgressBar pct={r.avgPct} /> : <span style={{ color: "#94a3b8" }}>—</span>}</td>
                      <td style={td}>
                        {latest ? (
                          <div>
                            <div style={{ fontWeight: 800 }}>{latest.skillName || "—"}</div>
                            <div style={{ fontSize: 12, color: latest.passed ? "#15803d" : "#b91c1c", marginTop: 4 }}>
                              {latest.score == null ? "—" : `${latest.score}%`} · {latest.passed ? "Passed" : "Failed"}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>—</span>
                        )}
                      </td>
                      <td style={td}>
                        {ongoing.length === 0 ? (
                          <button type="button" disabled style={{ ...btnMini, opacity: 0.5, cursor: "not-allowed" }}>
                            View analytics
                          </button>
                        ) : (
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {pick.map((o) => (
                              <button
                                type="button"
                                key={o.roleName}
                                onClick={() => setToast(`Analytics for ${o.roleName} — UI preview`)}
                                style={btnMini}
                              >
                                {o.roleName.length > 18 ? `${o.roleName.slice(0, 18)}…` : o.roleName}
                              </button>
                            ))}
                            {more > 0 ? <span style={{ fontSize: 12, fontWeight: 800, color: "#64748b" }}>+{more}</span> : null}
                          </div>
                        )}
                      </td>
                      <td style={td}>
                        <button
                          type="button"
                          onClick={() => setToast(`Recommend role to ${e.fullName} — UI preview`)}
                          style={btnRecommend}
                        >
                          💡 Recommend role
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {employeeTableHiddenCount > 0 && !employeeTableExpanded ? (
          <button type="button" onClick={() => setEmployeeTableExpanded(true)} style={{ ...btnViewMore, marginTop: 14 }}>
            View more · {employeeTableHiddenCount} more employee{employeeTableHiddenCount === 1 ? "" : "s"}
          </button>
        ) : employeeTableExpanded && filteredRows.length > EMPLOYEE_TABLE_PREVIEW_ROWS ? (
          <button type="button" onClick={() => setEmployeeTableExpanded(false)} style={{ ...btnViewMore, marginTop: 14 }}>
            Show less
          </button>
        ) : null}
      </div>

      <footer style={{ textAlign: "center", padding: "24px 0 8px", color: "#94a3b8", fontSize: 12 }}>
        Employee Management UI · Help & Support · Built with Next.js, React & Framer Motion
      </footer>
    </div>
  );
}

function KpiCard({ label, value, hint, icon, accent }: { label: string; value: string; hint?: string; icon?: string; accent: string }) {
  return (
    <motion.div
      initial={fade}
      animate={fadeIn}
      transition={{ duration: 0.4 }}
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 18,
        padding: 18,
        display: "flex",
        alignItems: "center",
        gap: 14,
        boxShadow: "0 6px 20px -10px rgba(15,23,42,0.10)",
        position: "relative",
        overflow: "hidden",
        minWidth: 0,
      }}
    >
      <div aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${accent}, ${accent}99)` }} />
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${accent}14`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flex: "0 0 auto" }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.3 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: "#0f172a", lineHeight: 1.1, marginTop: 2 }}>{value}</div>
        {hint ? <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{hint}</div> : null}
      </div>
    </motion.div>
  );
}

function BucketBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 9, height: 9, borderRadius: 999, background: color }} />
          {label}
        </span>
        <span style={{ color: "#475569" }}>
          <b>{count}</b> · {pct}%
        </span>
      </div>
      <div style={{ height: 12, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)`, height: "100%", transition: "width .35s ease", borderRadius: 999 }} />
      </div>
    </div>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  const safe = Math.max(0, Math.min(100, Math.round(pct)));
  const color = safe >= 75 ? "#16a34a" : safe >= 40 ? "#0b5fe8" : "#ea580c";
  return (
    <div>
      <div style={{ height: 9, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${safe}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)`, height: "100%", borderRadius: 999 }} />
      </div>
      <div style={{ fontSize: 12, marginTop: 4, fontWeight: 800 }}>{safe}%</div>
    </div>
  );
}

function TopVsLagging({ rows }: { rows: EmployeeRow[] }) {
  const active = rows.filter((r) => r.ongoing.length > 0);
  const sorted = active.slice().sort((a, b) => (b.avgPct || 0) - (a.avgPct || 0));
  const top = sorted.slice(0, LEADERBOARD_PREVIEW);
  const lag = sorted.slice(-LEADERBOARD_PREVIEW).reverse();

  if (active.length === 0) return <div style={emptyHint}>No active preparation in your team yet.</div>;

  return (
    <div style={{ marginTop: 12, display: "grid", gap: 14 }}>
      <RankedList title="Top performers" rows={top} accent="#16a34a" icon="🏆" />
      <RankedList title="Needs attention" rows={lag} accent="#ea580c" icon="📌" />
    </div>
  );
}

function DepartmentCompare({ rows }: { rows: EmployeeRow[] }) {
  const groups = new Map<string, { sum: number; count: number; active: number; total: number }>();
  for (const r of rows) {
    const dept = r.employee.department || "Unassigned";
    const g = groups.get(dept) || { sum: 0, count: 0, active: 0, total: 0 };
    g.total += 1;
    if (r.ongoing.length > 0) {
      g.active += 1;
      g.sum += r.avgPct || 0;
      g.count += 1;
    }
    groups.set(dept, g);
  }
  const list = Array.from(groups.entries())
    .map(([dept, g]) => ({ dept, avgPct: g.count > 0 ? Math.round(g.sum / g.count) : 0, active: g.active, total: g.total }))
    .sort((a, b) => b.avgPct - a.avgPct)
    .slice(0, 6);

  if (list.length === 0) return <div style={emptyHint}>No employees yet.</div>;

  return (
    <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
      {list.map((d) => (
        <div key={d.dept} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "10px 12px", background: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 800 }}>
            <span>{d.dept}</span>
            <span style={{ color: d.avgPct >= 70 ? "#16a34a" : "#0b5fe8" }}>{d.avgPct}% avg</span>
          </div>
          <div style={{ height: 6, background: "#f1f5f9", borderRadius: 999, overflow: "hidden", marginTop: 6 }}>
            <div style={{ width: `${d.avgPct}%`, background: "#6366f1", height: "100%" }} />
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
            {d.active} active · {d.total} total
          </div>
        </div>
      ))}
    </div>
  );
}

function RankedList({ title, rows, accent, icon }: { title: string; rows: EmployeeRow[]; accent: string; icon: string }) {
  if (rows.length === 0) return null;
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 900, color: accent, marginBottom: 8 }}>
        {icon} {title}
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {rows.map((r, i) => (
          <div key={r.employee._id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, background: "#f8fafc", border: "1px solid #e5e7eb" }}>
            <span style={{ fontWeight: 900, color: accent, width: 20 }}>#{i + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 13 }}>{r.employee.fullName}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{r.employee.designation}</div>
            </div>
            <span style={{ fontWeight: 900, color: accent }}>{r.avgPct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EngagementStrip({ activity }: { activity: MockActivity }) {
  const e = activity.engagement;
  const pct = (n: number) => (e.total > 0 ? Math.round((n / e.total) * 100) : 0);
  return (
    <div className="manager-engagement-grid">
      <EngagementCard label="Active in last 7 days" value={`${e.active7d}`} sub={`${pct(e.active7d)}% of team`} accent="#16a34a" icon="⚡" />
      <EngagementCard label="Active in last 30 days" value={`${e.active30d}`} sub={`${pct(e.active30d)}% of team`} accent="#0b5fe8" icon="📅" />
      <EngagementCard label="Dormant" value={`${e.dormant}`} sub={`${pct(e.dormant)}% no activity in 30d`} accent="#ea580c" icon="💤" />
      <EngagementCard label="Team size" value={`${e.total}`} sub="Across visible scope" accent="#7c3aed" icon="👥" />
    </div>
  );
}

function EngagementCard({ label, value, sub, accent, icon }: { label: string; value: string; sub: string; accent: string; icon?: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 16, minWidth: 0, position: "relative", overflow: "hidden" }}>
      <div aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>{label}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>{value}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{sub}</div>
        </div>
      </div>
    </div>
  );
}

function ActivityFeed({ feed }: { feed: ActivityEvent[] }) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = feed.length > ACTIVITY_FEED_PREVIEW;
  const visible = expanded || !hasMore ? feed : feed.slice(0, ACTIVITY_FEED_PREVIEW);

  return (
    <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gap: 8, maxHeight: expanded ? 560 : 360, overflowY: "auto" }}>
        {visible.map((evt, i) => {
          const meta = eventMeta(evt.type);
          return (
            <div key={i} style={{ display: "flex", gap: 10, padding: "10px 12px", borderRadius: 12, background: "#fff", border: "1px solid #e5e7eb", borderLeft: `3px solid ${meta.color}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13 }}>
                  <b>{evt.employeeName}</b> <span style={{ color: "#475569" }}>{meta.verb}</span>{" "}
                  {evt.skillName ? <b>{evt.skillName}</b> : evt.roleName ? <b>{evt.roleName}</b> : null}
                  {typeof evt.score === "number" ? <span style={{ marginLeft: 6, fontWeight: 800, color: meta.color }}>{evt.score}%</span> : null}
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                  {evt.employeeDepartment ? <>{evt.employeeDepartment} · </> : null}
                  {timeAgo(evt.at)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {hasMore ? (
        <button type="button" onClick={() => setExpanded((v) => !v)} style={btnViewMore}>
          {expanded ? "Show less" : `View more · ${feed.length - ACTIVITY_FEED_PREVIEW} more events`}
        </button>
      ) : null}
    </div>
  );
}

function RoleAggregateChart({ items }: { items: MockActivity["roleAggregates"] }) {
  const maxLearners = Math.max(1, ...items.map((r) => r.learners));
  return (
    <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
      {items.map((r) => {
        const lw = Math.round((r.learners / maxLearners) * 100);
        const progColor = r.avgPct >= 75 ? "#16a34a" : r.avgPct >= 40 ? "#2563eb" : "#ea580c";
        return (
          <div key={r.name} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "10px 12px", background: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 800 }}>
              <span>{r.name}</span>
              <span style={{ color: progColor }}>{r.avgPct}% avg</span>
            </div>
            <div style={{ height: 6, background: "#f1f5f9", borderRadius: 999, overflow: "hidden", marginTop: 6 }}>
              <div style={{ width: `${lw}%`, background: "#7c3aed", height: "100%" }} />
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{r.learners} learner{r.learners === 1 ? "" : "s"}</div>
          </div>
        );
      })}
    </div>
  );
}

function eventMeta(type: ActivityEvent["type"]): { color: string; verb: string } {
  switch (type) {
    case "TEST_PASSED": return { color: "#16a34a", verb: "passed test on" };
    case "TEST_FAILED": return { color: "#dc2626", verb: "failed test on" };
    case "SKILL_COMPLETED": return { color: "#0b5fe8", verb: "completed skill" };
    case "PREP_STARTED": return { color: "#7c3aed", verb: "started preparing for" };
    default: return { color: "#64748b", verb: "did something on" };
  }
}

function timeAgo(at: string): string {
  const t = new Date(at).getTime();
  const diff = Date.now() - t;
  if (diff < 60_000) return "just now";
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const wrap: React.CSSProperties = { display: "grid", gap: 18, position: "relative", width: "100%", minWidth: 0 };
const banner: React.CSSProperties = {
  borderRadius: 22,
  padding: "22px clamp(16px, 3vw, 24px)",
  background: "linear-gradient(135deg,#0f172a 0%,#1e293b 30%,#312e81 65%,#7c3aed 100%)",
  color: "#fff",
  position: "relative",
  overflow: "hidden",
  boxShadow: "0 16px 36px -22px rgba(99,102,241,0.55)",
};
const blobA: React.CSSProperties = { position: "absolute", top: -50, right: -30, width: 200, height: 200, borderRadius: "50%", background: "rgba(168,85,247,0.28)", pointerEvents: "none" };
const blobB: React.CSSProperties = { position: "absolute", bottom: -60, right: 110, width: 140, height: 140, borderRadius: "50%", background: "rgba(236,72,153,0.20)", pointerEvents: "none" };
const iconTile: React.CSSProperties = { width: 50, height: 50, borderRadius: 14, background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.28)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, flex: "0 0 auto" };
const breadcrumb: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: 12, marginBottom: 6 };
const crumbSep: React.CSSProperties = { color: "rgba(255,255,255,0.5)" };
const crumbCur: React.CSSProperties = { color: "#fff", fontWeight: 700 };
const bannerTitle: React.CSSProperties = { margin: 0, fontSize: 22, fontWeight: 900, lineHeight: 1.15 };
const bannerSub: React.CSSProperties = { marginTop: 4, fontSize: 13, color: "rgba(255,255,255,0.78)" };
const chipLive: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 12px", borderRadius: 999, background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.28)", fontWeight: 700, fontSize: 12 };
const btnSolid: React.CSSProperties = { padding: "8px 14px", borderRadius: 10, background: "#fff", color: "#0f172a", border: "none", fontWeight: 800, fontSize: 13, cursor: "pointer" };
const viewToggleBtn: React.CSSProperties = { padding: "8px 14px", border: "none", fontWeight: 800, fontSize: 12, cursor: "pointer" };
const cardElevated: React.CSSProperties = { background: "linear-gradient(180deg, #ffffff 0%, #fafbfc 100%)", border: "1px solid #e8eef5", borderRadius: 18, padding: 20 };
const cardTitle: React.CSSProperties = { fontSize: 15, fontWeight: 900, display: "flex", alignItems: "center", gap: 10 };
function titleIcon(accent: string): React.CSSProperties {
  return { width: 30, height: 30, borderRadius: 10, background: `${accent}14`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 14 };
}
const cardSub: React.CSSProperties = { fontSize: 12, color: "#64748b", marginTop: 4 };
const emptyHint: React.CSSProperties = { marginTop: 12, padding: 12, borderRadius: 12, background: "#f8fafc", color: "#64748b", fontSize: 13 };
const btnInvitePrimary: React.CSSProperties = { padding: "10px 18px", borderRadius: 12, border: "none", fontWeight: 900, fontSize: 13, cursor: "pointer", color: "#fff", background: "linear-gradient(135deg, #059669 0%, #10b981 45%, #34d399 100%)" };
const btnInviteSecondary: React.CSSProperties = { padding: "10px 14px", borderRadius: 12, border: "1px solid #cbd5e1", background: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer", color: "#475569" };
const btnScheduleHub: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 20px", borderRadius: 12, border: "none", fontWeight: 900, fontSize: 14, cursor: "pointer", color: "#fff", background: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 50%, #38bdf8 100%)" };
const toolbar: React.CSSProperties = { marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 12, padding: 14, borderRadius: 14, background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)", border: "1px solid #e2e8f0" };
const inputStyle: React.CSSProperties = { minHeight: 40, borderRadius: 10, border: "1px solid #cbd5e1", padding: "8px 12px", fontSize: 13, background: "#fff", width: "100%" };
const tableWrap: React.CSSProperties = { marginTop: 14, overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 16, background: "#fff" };
const employeeTableStyle: React.CSSProperties = { width: "100%", minWidth: 1080, borderCollapse: "collapse", fontSize: 13 };
const th: React.CSSProperties = { textAlign: "left", padding: "12px", fontWeight: 900, fontSize: 12, textTransform: "uppercase", borderBottom: "1px solid #e5e7eb" };
const td: React.CSSProperties = { padding: "12px", verticalAlign: "top", borderBottom: "1px solid #f1f5f9" };
const btnMini: React.CSSProperties = { border: "1px solid rgba(15,23,42,0.16)", background: "white", padding: "6px 10px", borderRadius: 10, fontWeight: 800, cursor: "pointer", fontSize: 12 };
const btnRecommend: React.CSSProperties = { border: "1px solid rgba(124, 58, 237, 0.35)", background: "linear-gradient(135deg, #ede9fe 0%, #fae8ff 100%)", color: "#5b21b6", padding: "8px 12px", borderRadius: 10, fontWeight: 900, fontSize: 12, cursor: "pointer", width: "100%" };
const btnViewMore: React.CSSProperties = { border: "1px solid #cbd5e1", background: "#fff", padding: "10px 14px", borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: "pointer", color: "#475569", width: "100%" };
const successStyle: React.CSSProperties = { padding: "10px 12px", borderRadius: 10, background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", fontSize: 13 };
const toastStyle: React.CSSProperties = { position: "fixed", top: 72, right: 20, zIndex: 100, padding: "12px 16px", borderRadius: 12, background: "#0f172a", color: "#fff", fontSize: 13, fontWeight: 700, boxShadow: "0 8px 24px rgba(15,23,42,0.25)", maxWidth: 360 };
