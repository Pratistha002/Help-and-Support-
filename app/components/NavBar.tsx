"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { appPath, publicAssetUrl, workforcePath } from "@/lib/apiBase";
import {
  buildInterviewXAdminLoginUrl,
  buildInterviewXManagerDashboardUrlWithSso,
  buildInterviewXManagerLandingUrlWithSso,
  buildInterviewXWalletUrlWithSso,
} from "@/lib/interviewx";
import {
  orgListMyRecommendations,
  orgUpdateRecommendationStatus,
  type RoleRecommendation,
} from "@/lib/orgNavbar";
import { clearAllSupportAuth, resolveSupportAuth, type SupportAuth } from "@/lib/resolveSupportAuth";
import { HelpAdminLoginModal } from "./HelpAdminLoginModal";
import "./NavBar.css";

const NOTIF_POLL_MS = 30_000;

export function NavBar() {
  const pathname = usePathname();

  const [auth, setAuth] = useState<SupportAuth>({ token: "", user: null, source: null });
  const [mounted, setMounted] = useState(false);
  const [authMenuOpen, setAuthMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const [notifs, setNotifs] = useState<RoleRecommendation[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [popupRec, setPopupRec] = useState<RoleRecommendation | null>(null);
  const [shownPopupIds, setShownPopupIds] = useState<Set<string>>(new Set());
  const [helpAdminOpen, setHelpAdminOpen] = useState(false);

  useEffect(() => {
    const sync = () => setAuth(resolveSupportAuth());
    setMounted(true);
    sync();
    window.addEventListener("hs-auth-changed", sync);
    window.addEventListener("jbv2-org-auth-changed", sync);
    return () => {
      window.removeEventListener("hs-auth-changed", sync);
      window.removeEventListener("jbv2-org-auth-changed", sync);
    };
  }, [pathname]);

  const user = auth.user;
  const isLoggedIn = mounted && Boolean(auth.token);
  const isAdmin = Boolean(user && user.accountType === "ADMIN");
  const isManager = Boolean(user && user.accountType === "EMPLOYEE" && user.currentRole === "MANAGER");
  const isHR = Boolean(user && user.accountType === "EMPLOYEE" && user.currentRole === "HR");
  const isManagerOrHR = isManager || isHR;
  const isEmployee = Boolean(user && user.accountType === "EMPLOYEE" && !isManagerOrHR);

  const logout = () => {
    clearAllSupportAuth();
    if (isEmployee) {
      window.location.href = workforcePath("/auth/employee/login");
    } else if (isManagerOrHR) {
      window.location.href = workforcePath("/auth/manager/login");
    } else {
      window.location.href = workforcePath("/");
    }
  };

  useEffect(() => {
    setAuthMenuOpen(false);
    setProfileMenuOpen(false);
  }, [pathname, isLoggedIn]);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [profileMenuOpen]);

  useEffect(() => {
    if (!isEmployee || !auth.token || auth.source !== "org") {
      setNotifs([]);
      return;
    }
    let cancelled = false;
    const fetchInbox = async () => {
      try {
        const list = await orgListMyRecommendations(auth.token);
        if (cancelled) return;
        setNotifs(Array.isArray(list) ? list : []);
        const pending = (list || []).filter((r) => r.status === "PENDING");
        const unseen = pending.find((r) => !shownPopupIds.has(r._id));
        if (unseen) {
          setPopupRec(unseen);
          setShownPopupIds((prev) => {
            const next = new Set(prev);
            next.add(unseen._id);
            return next;
          });
        }
      } catch {
        /* silent */
      }
    };
    void fetchInbox();
    const id = window.setInterval(() => void fetchInbox(), NOTIF_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmployee, auth.token, auth.source]);

  const pendingNotifs = notifs.filter((r) => r.status === "PENDING" || r.status === "SEEN");
  const pendingCount = notifs.filter((r) => r.status === "PENDING").length;

  const markStatus = async (id: string, status: "SEEN" | "DISMISSED" | "ACCEPTED") => {
    try {
      const updated = await orgUpdateRecommendationStatus(auth.token, id, status);
      setNotifs((prev) => prev.map((n) => (n._id === id ? { ...n, ...updated } : n)));
    } catch {
      /* ignore */
    }
  };

  const goToRole = async (rec: RoleRecommendation) => {
    await markStatus(rec._id, "SEEN");
    setNotifOpen(false);
    setPopupRec(null);
    window.location.href = workforcePath(`/role/${encodeURIComponent(rec.roleName)}`);
  };

  const managerSsoOpts =
    isManagerOrHR && auth.token
      ? {
          token: auth.token,
          email: user?.email,
          name: user?.fullName,
          userType: isHR ? "HR" : "MANAGER",
        }
      : null;

  const managerInterviewXHomeHref = managerSsoOpts ? buildInterviewXManagerLandingUrlWithSso(managerSsoOpts) : "";
  const managerInterviewXDashboardHref = managerSsoOpts
    ? buildInterviewXManagerDashboardUrlWithSso(managerSsoOpts)
    : "";
  const managerInterviewXWalletHref = managerSsoOpts ? buildInterviewXWalletUrlWithSso(managerSsoOpts) : "";
  const employeeDashboardHref = workforcePath("/dashboard/employee");
  const monitoringHref = workforcePath("/dashboard/manager/");
  const dashboardHref =
    isAdmin && auth.source === "hs" ? appPath("admin") : workforcePath("/dashboard/admin");
  const profileHref = isAdmin ? workforcePath("/profile/admin") : workforcePath("/profile/employee");
  const profileLabel = isAdmin ? "Admin Profile" : "Employee Profile";
  const brandHref =
    isLoggedIn && isEmployee
      ? workforcePath("/employee/")
      : isLoggedIn && isManagerOrHR
        ? managerInterviewXHomeHref
        : workforcePath("/");
  const brandAriaLabel =
    isLoggedIn && isEmployee
      ? "Corporate Development — go to employee home"
      : isLoggedIn && isManagerOrHR
        ? "Corporate Development — go to Technical Assesment home"
        : "Corporate Development — home";
  const adminLoginHref = buildInterviewXAdminLoginUrl();
  const logoSrc = publicAssetUrl("/brand/sx-workforce-transparent.png");

  return (
    <header className="jb-nav">
      <div className="jb-nav__inner">
        {isLoggedIn && isManagerOrHR ? (
          <a href={brandHref} className="jb-nav__brand" aria-label={brandAriaLabel}>
            <span className="jb-nav__logoWrap">
              <img
                src={logoSrc}
                alt="SX Workforce"
                width={640}
                height={200}
                className="jb-nav__logo"
                decoding="async"
                fetchPriority="high"
              />
            </span>
          </a>
        ) : (
          <a href={brandHref} className="jb-nav__brand" aria-label={brandAriaLabel}>
            <span className="jb-nav__logoWrap">
              <img
                src={logoSrc}
                alt="SX Workforce"
                width={640}
                height={200}
                className="jb-nav__logo"
                decoding="async"
                fetchPriority="high"
              />
            </span>
          </a>
        )}

        <div style={{ flex: 1, minWidth: 0 }} />

        {isLoggedIn ? (
          <div className="jb-nav__actions">
            {isEmployee ? (
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setNotifOpen((v) => !v)}
                  aria-label="Notifications"
                  style={bellStyle}
                  title={pendingCount ? `${pendingCount} new role recommendation${pendingCount > 1 ? "s" : ""}` : "Notifications"}
                >
                  <span style={{ fontSize: 18, lineHeight: 1 }}>🔔</span>
                  {pendingCount > 0 ? (
                    <span style={badgeStyle}>{pendingCount > 9 ? "9+" : pendingCount}</span>
                  ) : null}
                </button>
                {notifOpen ? (
                  <div style={dropdownStyle} onMouseLeave={() => setNotifOpen(false)}>
                    <div style={dropdownHeader}>
                      <div style={{ fontWeight: 900, color: "#0f172a", fontSize: 14 }}>Notifications</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>
                        {pendingCount > 0 ? `${pendingCount} new` : "You're all caught up"}
                      </div>
                    </div>
                    {pendingNotifs.length === 0 ? (
                      <div style={{ padding: 18, textAlign: "center", color: "#64748b", fontSize: 13 }}>
                        No role recommendations yet.
                      </div>
                    ) : (
                      <div style={{ maxHeight: 360, overflowY: "auto" }}>
                        {pendingNotifs.map((rec) => (
                          <div key={rec._id} style={notifItem}>
                            <div style={{ fontSize: 12, color: "#7c3aed", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>
                              Role suggestion
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a", marginTop: 2 }}>{rec.roleName}</div>
                            <div style={{ fontSize: 12, color: "#475569", marginTop: 4, lineHeight: 1.5 }}>
                              From <b>{rec.recommendedByName || rec.recommendedByEmail}</b>
                              {rec.recommendedByRole ? <> · {rec.recommendedByRole === "HR" ? "HR" : "Manager"}</> : null}
                            </div>
                            {rec.note ? (
                              <div style={{ fontSize: 12, color: "#334155", marginTop: 6, padding: "6px 8px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, fontStyle: "italic" }}>
                                &ldquo;{rec.note}&rdquo;
                              </div>
                            ) : null}
                            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                              <button onClick={() => goToRole(rec)} style={notifPrimaryBtn}>
                                View role
                              </button>
                              <button onClick={() => void markStatus(rec._id, "DISMISSED")} style={notifSecondaryBtn}>
                                Dismiss
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
            {isEmployee ? (
              <>
                <a href={employeeDashboardHref} className="jb-nav__portalBtn jb-nav__portalBtn--dashboard">
                  <span className="jb-nav__portalBtn-label">Dashboard</span>
                  <span className="jb-nav__portalBtn-sub">TalentX</span>
                </a>
                <div className="jb-nav__profileWrap" ref={profileMenuRef}>
                  <button
                    type="button"
                    className={`jb-nav__profileBtn${profileMenuOpen ? " jb-nav__profileBtn--open" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setProfileMenuOpen((v) => !v);
                    }}
                    aria-haspopup="true"
                    aria-expanded={profileMenuOpen}
                  >
                    <span className="jb-nav__profileBtnInner">
                      <span className="jb-nav__portalBtn-label">Profile</span>
                      <span className="jb-nav__portalBtn-sub">Account</span>
                    </span>
                    <span className="jb-nav__profileChevron" aria-hidden="true">
                      {profileMenuOpen ? "▲" : "▼"}
                    </span>
                  </button>
                  {profileMenuOpen ? (
                    <div className="jb-nav__profileMenu" role="menu">
                      <a href={profileHref} className="jb-nav__profileMenuItem" role="menuitem" onClick={() => setProfileMenuOpen(false)}>
                        Employee Profile
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          logout();
                        }}
                        className="jb-nav__profileMenuItem jb-nav__profileMenuItem--logout"
                        role="menuitem"
                      >
                        Logout
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            ) : isManagerOrHR ? (
              <>
                <a href={managerInterviewXDashboardHref} className="jb-nav__portalBtn jb-nav__portalBtn--dashboard">
                  <span className="jb-nav__portalBtn-label">Dashboard</span>
                  <span className="jb-nav__portalBtn-sub">InterviewX</span>
                </a>
                <a href={monitoringHref} className="jb-nav__portalBtn jb-nav__portalBtn--monitor">
                  <span className="jb-nav__portalBtn-label">Monitoring</span>
                  <span className="jb-nav__portalBtn-sub">TalentX</span>
                </a>
                <div className="jb-nav__profileWrap" ref={profileMenuRef}>
                  <button
                    type="button"
                    className={`jb-nav__profileBtn${profileMenuOpen ? " jb-nav__profileBtn--open" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setProfileMenuOpen((v) => !v);
                    }}
                    aria-haspopup="true"
                    aria-expanded={profileMenuOpen}
                  >
                    <span className="jb-nav__profileBtnInner">
                      <span className="jb-nav__portalBtn-label">Profile</span>
                      <span className="jb-nav__portalBtn-sub">Account</span>
                    </span>
                    <span className="jb-nav__profileChevron" aria-hidden="true">
                      {profileMenuOpen ? "▲" : "▼"}
                    </span>
                  </button>
                  {profileMenuOpen ? (
                    <div className="jb-nav__profileMenu" role="menu">
                      <a href={managerInterviewXWalletHref} className="jb-nav__profileMenuItem" role="menuitem" onClick={() => setProfileMenuOpen(false)}>
                        Wallet
                      </a>
                      <a href={profileHref} className="jb-nav__profileMenuItem" role="menuitem" onClick={() => setProfileMenuOpen(false)}>
                        View Profile
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          logout();
                        }}
                        className="jb-nav__profileMenuItem jb-nav__profileMenuItem--logout"
                        role="menuitem"
                      >
                        Logout
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            ) : isAdmin ? (
              <>
                <a href={dashboardHref} style={portalDashStyle}>
                  Dashboard
                </a>
                <a href={profileHref} style={portalDashStyle}>
                  {profileLabel}
                </a>
                <button type="button" onClick={logout} style={portalLogoutStyle}>
                  Logout
                </button>
              </>
            ) : null}
          </div>
        ) : mounted ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
            <button type="button" style={portalLoginStyle} onClick={() => setAuthMenuOpen((v) => !v)}>
              Login / Signup
            </button>
            {authMenuOpen ? (
              <div style={authMenuCard}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b", marginBottom: 8 }}>Choose login type</div>
                <a href={workforcePath("/auth/employee/login")} style={authMenuItem} onClick={() => setAuthMenuOpen(false)}>
                  Login as Employee
                </a>
                <a href={workforcePath("/auth/manager/login")} style={authMenuItem} onClick={() => setAuthMenuOpen(false)}>
                  Login as Manager / HR
                </a>
                <a href={adminLoginHref} style={authMenuItem} onClick={() => setAuthMenuOpen(false)}>
                  Admin Login
                </a>
                <button
                  type="button"
                  style={{ ...authMenuItem, width: "100%", textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}
                  onClick={() => {
                    setAuthMenuOpen(false);
                    setHelpAdminOpen(true);
                  }}
                >
                  Help Desk Admin
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {popupRec ? (
        <div style={popupBackdrop} onClick={() => setPopupRec(null)}>
          <div style={popupCard} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 11, fontWeight: 900, color: "#7c3aed", textTransform: "uppercase", letterSpacing: 1, whiteSpace: "nowrap" }}>
              New role recommendation
            </div>
            <h3 style={{ margin: "6px 0 4px", color: "#0f172a", fontSize: 18, fontWeight: 900 }}>
              {popupRec.recommendedByName || popupRec.recommendedByEmail} suggested a role for you
            </h3>
            <div style={{ fontSize: 13, color: "#475569" }}>
              They think <b style={{ color: "#5b21b6" }}>{popupRec.roleName}</b> is a good fit. Open the role page to start preparing.
            </div>
            {popupRec.note ? (
              <div style={{ marginTop: 10, padding: "8px 10px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, color: "#334155", fontStyle: "italic" }}>
                &ldquo;{popupRec.note}&rdquo;
              </div>
            ) : null}
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <button onClick={() => goToRole(popupRec)} style={popupPrimary}>
                View role
              </button>
              <button
                onClick={() => {
                  void markStatus(popupRec._id, "SEEN");
                  setPopupRec(null);
                }}
                style={popupSecondary}
              >
                Later
              </button>
              <button
                onClick={() => {
                  void markStatus(popupRec._id, "DISMISSED");
                  setPopupRec(null);
                }}
                style={popupGhost}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <HelpAdminLoginModal open={helpAdminOpen} onClose={() => setHelpAdminOpen(false)} />
    </header>
  );
}

const portalLoginStyle: CSSProperties = {
  textDecoration: "none",
  border: "1px solid rgba(5, 74, 144, 0.22)",
  color: "#0f172a",
  borderRadius: 10,
  padding: "8px 12px",
  fontSize: 14,
  fontWeight: 800,
  lineHeight: "20px",
  background: "#fff",
  cursor: "pointer",
};

const authMenuCard: CSSProperties = {
  position: "absolute",
  right: 0,
  top: "calc(100% + 8px)",
  width: 230,
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  boxShadow: "0 16px 34px -14px rgba(15,23,42,0.28)",
  padding: 10,
  zIndex: 100,
};

const authMenuItem: CSSProperties = {
  display: "block",
  textDecoration: "none",
  color: "#0f172a",
  border: "1px solid #e2e8f0",
  borderRadius: 9,
  padding: "8px 10px",
  fontSize: 13,
  fontWeight: 700,
  marginTop: 6,
  background: "#f8fafc",
};

const portalDashStyle: CSSProperties = {
  textDecoration: "none",
  border: "1px solid rgba(5, 74, 144, 0.22)",
  color: "#0f172a",
  borderRadius: 10,
  padding: "8px 12px",
  fontSize: 14,
  fontWeight: 900,
  lineHeight: "20px",
  background: "#fff",
};

const portalLogoutStyle: CSSProperties = {
  border: "1px solid #fecaca",
  background: "#fff",
  color: "#991b1b",
  borderRadius: 10,
  padding: "8px 12px",
  fontSize: 14,
  fontWeight: 900,
  lineHeight: "20px",
  cursor: "pointer",
};

const bellStyle: CSSProperties = {
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 38,
  height: 38,
  borderRadius: 999,
  background: "#fff",
  border: "1px solid rgba(5, 74, 144, 0.2)",
  cursor: "pointer",
  padding: 0,
};

const badgeStyle: CSSProperties = {
  position: "absolute",
  top: -4,
  right: -4,
  minWidth: 18,
  height: 18,
  padding: "0 5px",
  borderRadius: 999,
  background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
  color: "#fff",
  fontSize: 10,
  fontWeight: 900,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 2px 6px rgba(220,38,38,0.35)",
  border: "2px solid #fff",
};

const dropdownStyle: CSSProperties = {
  position: "absolute",
  right: 0,
  top: "calc(100% + 8px)",
  width: 340,
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  boxShadow: "0 20px 35px -10px rgba(15,23,42,0.18)",
  overflow: "hidden",
  zIndex: 90,
};

const dropdownHeader: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 14px",
  borderBottom: "1px solid #f1f5f9",
  background: "linear-gradient(135deg, #faf5ff 0%, #fdf4ff 100%)",
};

const notifItem: CSSProperties = {
  padding: "12px 14px",
  borderBottom: "1px solid #f1f5f9",
};

const notifPrimaryBtn: CSSProperties = {
  background: "linear-gradient(135deg, #7c3aed 0%, #c026d3 100%)",
  color: "#fff",
  border: "none",
  padding: "6px 12px",
  borderRadius: 8,
  fontWeight: 900,
  fontSize: 12,
  cursor: "pointer",
  boxShadow: "0 4px 10px -4px rgba(124,58,237,0.55)",
};

const notifSecondaryBtn: CSSProperties = {
  background: "#fff",
  color: "#475569",
  border: "1px solid #cbd5e1",
  padding: "6px 12px",
  borderRadius: 8,
  fontWeight: 800,
  fontSize: 12,
  cursor: "pointer",
};

const popupBackdrop: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.5)",
  backdropFilter: "blur(2px)",
  zIndex: 200,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

const popupCard: CSSProperties = {
  width: "100%",
  maxWidth: 460,
  background: "#fff",
  borderRadius: 18,
  border: "1px solid #e5e7eb",
  padding: 22,
  boxShadow: "0 25px 50px -12px rgba(0,0,0,0.4)",
};

const popupPrimary: CSSProperties = {
  background: "linear-gradient(135deg, #7c3aed 0%, #c026d3 100%)",
  color: "#fff",
  border: "none",
  padding: "10px 14px",
  borderRadius: 10,
  fontWeight: 900,
  fontSize: 13,
  cursor: "pointer",
  boxShadow: "0 8px 20px -8px rgba(124,58,237,0.55)",
};

const popupSecondary: CSSProperties = {
  background: "#fff",
  color: "#0f172a",
  border: "1px solid #cbd5e1",
  padding: "10px 14px",
  borderRadius: 10,
  fontWeight: 800,
  fontSize: 13,
  cursor: "pointer",
};

const popupGhost: CSSProperties = {
  background: "transparent",
  color: "#94a3b8",
  border: "none",
  padding: "10px 8px",
  borderRadius: 10,
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};
