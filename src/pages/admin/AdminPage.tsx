import { useEffect, useState } from "react";
import { FiArchive, FiDollarSign, FiEdit3, FiFlag, FiLayers, FiMessageCircle, FiUsers } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { AdminFanProjectsPanel } from "../../components/admin/AdminFanProjectsPanel";
import { AdminInternalDonationPanel } from "../../components/admin/AdminInternalDonationPanel";
import { AdminMilestonesPanel } from "../../components/admin/AdminMilestonesPanel";
import { AdminSocialUpdatesPanel } from "../../components/admin/AdminSocialUpdatesPanel";
import { AdminLiquidationPanel } from "../../components/admin/AdminLiquidation";
import { AdminTicketsPanel } from "../../components/admin/AdminTicketsPanel";
import { AdminUsersPanel } from "../../components/admin/AdminUsersPanel";
import { useAuthProfile } from "../../hooks/useAuthProfile";
import { supabase } from "../../lib/supabase";
import { sendLocalNotification } from "../../services/pwa";

type AdminSection = "campaigns" | "updates" | "donations" | "liquidation" | "fan-projects" | "tickets" | "users";

function AdminSkeleton() {
  return (
    <section className="admin-shell admin-skeleton-shell" aria-label="Loading admin panel">
      <header className="admin-topbar admin-skeleton-topbar">
        <div>
          <span className="skeleton-line skeleton-chip" />
          <span className="skeleton-line skeleton-title" />
          <span className="skeleton-line skeleton-copy" />
        </div>
        <span className="skeleton-line skeleton-button admin-skeleton-logout" />
      </header>
      <div className="admin-layout">
        <aside className="admin-sidebar-panel admin-skeleton-sidebar">
          <span className="skeleton-line skeleton-chip" />
          <span className="skeleton-line skeleton-button" />
          <span className="skeleton-line skeleton-button" />
          <span className="skeleton-line skeleton-button" />
          <span className="skeleton-line skeleton-button" />
          <span className="skeleton-line skeleton-button" />
        </aside>
        <div className="admin-content-stack">
          <section className="admin-panel admin-skeleton-content">
            <span className="skeleton-line skeleton-chip" />
            <span className="skeleton-line skeleton-heading" />
            <span className="skeleton-line skeleton-copy" />
            <div className="admin-skeleton-grid">
              <span className="skeleton-line skeleton-input" />
              <span className="skeleton-line skeleton-input" />
              <span className="skeleton-line skeleton-input" />
              <span className="skeleton-line skeleton-input" />
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

export function AdminPage() {
  const navigate = useNavigate();
  const { session, loading, profile, isAdmin, refreshProfile } = useAuthProfile();
  const [activeSection, setActiveSection] = useState<AdminSection>("campaigns");

  useEffect(() => {
    if (!loading && !session) navigate("/admin/login", { replace: true });
  }, [loading, navigate, session]);

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut();
    navigate("/admin/login", { replace: true });
  }

  if (loading) {
    return <AdminSkeleton />;
  }
  if (!session) {
    return null;
  }
  if (!isAdmin) {
    return (
      <section className="page-panel">
        <p className="eyebrow">Admin Access</p>
        <h1>Permission required</h1>
        <p className="muted-text">Your account is signed in, but it is not assigned as an SBL admin.</p>
        <div className="admin-permission-details">
          <span>Email: {profile?.email || session.user.email || "Unknown"}</span>
          <span>Role: {profile?.role || "No profile"}</span>
          <span>Status: {profile?.status || "No profile"}</span>
        </div>
        <button className="button primary" type="button" onClick={() => void refreshProfile()}>Recheck Access</button>
        <button className="button secondary" type="button" onClick={handleLogout}>Log Out</button>
      </section>
    );
  }

  const adminGreetingName = profile?.display_name || (profile?.username ? `@${profile.username}` : "") || profile?.email || session.user.email || "Admin";

  return (
    <section className="admin-shell">
      <header className="admin-topbar">
        <div>
          <p className="eyebrow">Solid Block Link • Admin Panel</p>
          <h1>Hi, {adminGreetingName}! Welcome back.</h1>
          <p className="muted-text">Manage campaigns, fan projects, updates, donations, tickets, users, and liquidation records.</p>
        </div>
        <div className="admin-topbar-actions" style={{ display: "flex", gap: "8px" }}>
          <button
            className="button secondary"
            type="button"
            onClick={() => {
              void sendLocalNotification("Solid Block Link • Admin Push Test 🚀", {
                body: "Push notification alert system is active for mobile and laptop app users!",
                url: "/admin"
              });
            }}
          >
            Test Push Alert
          </button>
          <button className="button secondary" type="button" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </header>
      <div className="admin-layout">
        <aside className="admin-sidebar-panel">
          <p className="admin-sidebar-title">Content</p>
          <nav className="admin-sidebar-nav">
            <button
              type="button"
              className={activeSection === "campaigns" ? "admin-sidebar-link active" : "admin-sidebar-link"}
              onClick={() => setActiveSection("campaigns")}
            >
              <span className="admin-link-icon" aria-hidden="true"><FiLayers /></span>
              Campaigns
            </button>
            <button
              type="button"
              className={activeSection === "updates" ? "admin-sidebar-link active" : "admin-sidebar-link"}
              onClick={() => setActiveSection("updates")}
            >
              <span className="admin-link-icon" aria-hidden="true"><FiEdit3 /></span>
              Updates
            </button>
            <button
              type="button"
              className={activeSection === "liquidation" ? "admin-sidebar-link active" : "admin-sidebar-link"}
              onClick={() => setActiveSection("liquidation")}
            >
              <span className="admin-link-icon" aria-hidden="true"><FiArchive /></span>
              Liquidation
            </button>
            <button
              type="button"
              className={activeSection === "fan-projects" ? "admin-sidebar-link active" : "admin-sidebar-link"}
              onClick={() => setActiveSection("fan-projects")}
            >
              <span className="admin-link-icon" aria-hidden="true"><FiFlag /></span>
              Fan Projects
            </button>
            <button
              type="button"
              className={activeSection === "donations" ? "admin-sidebar-link active" : "admin-sidebar-link"}
              onClick={() => setActiveSection("donations")}
            >
              <span className="admin-link-icon" aria-hidden="true"><FiDollarSign /></span>
              Donations
            </button>
            <button
              type="button"
              className={activeSection === "tickets" ? "admin-sidebar-link active" : "admin-sidebar-link"}
              onClick={() => setActiveSection("tickets")}
            >
              <span className="admin-link-icon" aria-hidden="true"><FiMessageCircle /></span>
              Tickets
            </button>
            <button
              type="button"
              className={activeSection === "users" ? "admin-sidebar-link active" : "admin-sidebar-link"}
              onClick={() => setActiveSection("users")}
            >
              <span className="admin-link-icon" aria-hidden="true"><FiUsers /></span>
              Users
            </button>
          </nav>
        </aside>
        <div className="admin-content-stack">
          <div className={activeSection === "updates" ? "admin-section active" : "admin-section"}>
            <div className="admin-dual-grid single">
              <AdminSocialUpdatesPanel />
            </div>
          </div>
          <div className={activeSection === "liquidation" ? "admin-section active" : "admin-section"}>
            <div className="admin-dual-grid single">
              <AdminLiquidationPanel />
            </div>
          </div>
          <div className={activeSection === "fan-projects" ? "admin-section active" : "admin-section"}>
            <div className="admin-dual-grid single">
              <AdminFanProjectsPanel />
            </div>
          </div>
          <div className={activeSection === "campaigns" ? "admin-section active" : "admin-section"}>
            <div className="admin-dual-grid single">
              <AdminMilestonesPanel />
            </div>
          </div>
          <div className={activeSection === "donations" ? "admin-section active" : "admin-section"}>
            <div className="admin-dual-grid single">
              <AdminInternalDonationPanel />
            </div>
          </div>
          <div className={activeSection === "tickets" ? "admin-section active" : "admin-section"}>
            <div className="admin-dual-grid single">
              <AdminTicketsPanel />
            </div>
          </div>
          <div className={activeSection === "users" ? "admin-section active" : "admin-section"}>
            <div className="admin-dual-grid single">
              <AdminUsersPanel />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
