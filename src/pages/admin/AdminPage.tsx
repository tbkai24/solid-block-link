import { useEffect, useState } from "react";
import { FiDollarSign, FiEdit3, FiHome, FiLayers } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { AdminInternalDonationPanel } from "../../components/admin/AdminInternalDonationPanel";
import { AdminMilestonesPanel } from "../../components/admin/AdminMilestonesPanel";
import { AdminSiteSettingsPanel } from "../../components/admin/AdminSiteSettingsPanel";
import { AdminSocialUpdatesPanel } from "../../components/admin/AdminSocialUpdatesPanel";
import { useAdminSession } from "../../hooks/useAdminSession";
import { supabase } from "../../lib/supabase";

type AdminSection = "settings" | "updates" | "milestones" | "internal";

export function AdminPage() {
  const navigate = useNavigate();
  const { session, loading } = useAdminSession();
  const [activeSection, setActiveSection] = useState<AdminSection>("settings");

  useEffect(() => {
    if (!loading && !session) navigate("/admin/login", { replace: true });
  }, [loading, navigate, session]);

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut();
    navigate("/admin/login", { replace: true });
  }

  if (loading) {
    return <section className="page-panel"><p>Checking admin session...</p></section>;
  }
  if (!session) {
    return null;
  }

  return (
    <section className="admin-shell">
      <header className="admin-topbar">
        <div>
          <p className="eyebrow">Solid Block Link</p>
          <h1>Admin Panel</h1>
          <p className="muted-text">Edit site settings, social updates, milestones, and internal donations.</p>
        </div>
        <button className="button secondary" type="button" onClick={handleLogout}>
          Log Out
        </button>
      </header>
      <div className="admin-layout">
        <aside className="admin-sidebar-panel">
          <p className="admin-sidebar-title">Content</p>
          <nav className="admin-sidebar-nav">
            <button
              type="button"
              className={activeSection === "settings" ? "admin-sidebar-link active" : "admin-sidebar-link"}
              onClick={() => setActiveSection("settings")}
            >
              <span className="admin-link-icon" aria-hidden="true"><FiHome /></span>
              Site Settings
            </button>
            <button
              type="button"
              className={activeSection === "updates" ? "admin-sidebar-link active" : "admin-sidebar-link"}
              onClick={() => setActiveSection("updates")}
            >
              <span className="admin-link-icon" aria-hidden="true"><FiEdit3 /></span>
              Social Updates
            </button>
            <button
              type="button"
              className={activeSection === "internal" ? "admin-sidebar-link active" : "admin-sidebar-link"}
              onClick={() => setActiveSection("internal")}
            >
              <span className="admin-link-icon" aria-hidden="true"><FiDollarSign /></span>
              Internal Donation
            </button>
            <button
              type="button"
              className={activeSection === "milestones" ? "admin-sidebar-link active" : "admin-sidebar-link"}
              onClick={() => setActiveSection("milestones")}
            >
              <span className="admin-link-icon" aria-hidden="true"><FiLayers /></span>
              Milestone
            </button>
          </nav>
        </aside>
        <div className="admin-content-stack">
          <div className={activeSection === "settings" ? "admin-section active" : "admin-section"}>
            <AdminSiteSettingsPanel />
          </div>
          <div className={activeSection === "updates" ? "admin-section active" : "admin-section"}>
            <div className="admin-dual-grid single">
              <AdminSocialUpdatesPanel />
            </div>
          </div>
          <div className={activeSection === "milestones" ? "admin-section active" : "admin-section"}>
            <div className="admin-dual-grid single">
              <AdminMilestonesPanel />
            </div>
          </div>
          <div className={activeSection === "internal" ? "admin-section active" : "admin-section"}>
            <div className="admin-dual-grid single">
              <AdminInternalDonationPanel />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
