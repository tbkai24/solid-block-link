// src/pages/admin/AdminPage.tsx
import { useEffect, useState } from "react";
import { FiArchive, FiDollarSign, FiEdit3, FiFlag, FiLayers, FiMail } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { AdminContactMessagesPanel } from "./AdminContactMessagesPanel";
import { AdminFanProjectsPanel } from "../../components/admin/AdminFanProjectsPanel";
import { AdminInternalDonationPanel } from "../../components/admin/AdminInternalDonationPanel";
import { AdminMilestonesPanel } from "../../components/admin/AdminMilestonesPanel";
import { AdminSocialUpdatesPanel } from "../../components/admin/AdminSocialUpdatesPanel"; // Use this one
import { AdminLiquidationPanel } from "../../components/admin/AdminLiquidation";
import { useAdminSession } from "../../hooks/useAdminSession";
import { supabase } from "../../lib/supabase";

type AdminSection = "campaigns" | "updates" | "donations" | "liquidation" | "fan-projects" | "contact";

export function AdminPage() {
  const navigate = useNavigate();
  const { session, loading } = useAdminSession();
  const [activeSection, setActiveSection] = useState<AdminSection>("campaigns");

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
          <p className="eyebrow">Solid Block Link • Admin Panel</p>
          <h1>Hi, Admin! Welcome back.</h1>
          <p className="muted-text">Manage campaigns, fan projects, updates, donations, contact messages, and liquidation records.</p>
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
              className={activeSection === "campaigns" ? "admin-sidebar-link active" : "admin-sidebar-link"}
              onClick={() => setActiveSection("campaigns")}
            >
              <span className="admin-link-icon" aria-hidden="true"><FiLayers /></span>
              Campaigns
            </button>
            <button
              type="button"
              className={activeSection === "contact" ? "admin-sidebar-link active" : "admin-sidebar-link"}
              onClick={() => setActiveSection("contact")}
            >
              <span className="admin-link-icon" aria-hidden="true"><FiMail /></span>
              Contact
            </button>
          </nav>
        </aside>
        <div className="admin-content-stack">
          <div className={activeSection === "updates" ? "admin-section active" : "admin-section"}>
            <div className="admin-dual-grid single">
              <AdminSocialUpdatesPanel /> {/* Correct Component */}
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
          <div className={activeSection === "contact" ? "admin-section active" : "admin-section"}>
            <div className="admin-dual-grid single">
              <AdminContactMessagesPanel />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
