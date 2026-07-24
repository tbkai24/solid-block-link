import { Link } from "react-router-dom";
import { FiArchive, FiCheckCircle, FiClock, FiFileText, FiTrendingUp } from "react-icons/fi";
import { formatCurrency, formatPercentage, formatViewerDateTime } from "../services/format";
import { useSiteContent } from "../hooks/useSiteContent";

const reportItems = [
  "Funds received from public donations and internal support",
  "Campaign goal and remaining amount needed",
  "Liquidation records with supporting images, captions, and report links",
  "Campaign archive for completed, active, and not achieved drives",
  "Status notes while expenses and final reports are still being validated"
];

const principles = [
  "Accountability: supporters can review how campaign funds are tracked",
  "Verification: donation progress connects with lookup and campaign records",
  "Clarity: liquidation posts hold proof, receipts, and supporting report links",
  "Completion: final updates are posted after expenses are collected and checked",
  "Trust: transparent records help future fan-led campaigns stay credible"
];

export function TransparencyReportPage() {
  const { content, loading } = useSiteContent();
  const raised = Number(content.progress.totalRaised || 0);
  const publicRaised = Number(content.progress.publicRaised || raised);
  const internalRaised = Number(content.progress.internalRaised || 0);
  const goal = Number(content.progress.goal || 0);
  const remaining = Math.max(goal - raised, 0);
  const percent = goal > 0 ? Math.min((raised / goal) * 100, 100) : 0;
  const lastUpdated = formatViewerDateTime(content.progress.lastUpdated) || "awaiting latest sync";

  return (
    <section className="page-shell transparency-report-page">
      <div className="page-panel page-hero-panel transparency-report-hero">
        <p className="eyebrow">Transparency Report</p>
        <h1>Clear campaign records for every supporter.</h1>
        <p className="page-lead">
          SBL keeps donation progress, liquidation records, and report status in one place so supporters can review campaign movement clearly.
        </p>
      </div>

      <section className="hub-panel report-panel transparency-summary-panel">
        <div className="transparency-summary-head">
          <div>
            <p className="eyebrow">Campaign Summary</p>
            <h2>{content.currentCampaign.title || "Current SBL campaign"}</h2>
          </div>
          <span className="transparency-status-chip">
            {loading ? <FiClock aria-hidden="true" /> : <FiCheckCircle aria-hidden="true" />}
            {loading ? "Refreshing" : "Synced"}
          </span>
        </div>

        <div className="transparency-metric-grid">
          <article>
            <span>Funds Received</span>
            <strong>{formatCurrency(raised)}</strong>
            <p>Public and internal support combined.</p>
          </article>
          <article>
            <span>Public Donations</span>
            <strong>{formatCurrency(publicRaised)}</strong>
            <p>Support visible through campaign progress.</p>
          </article>
          <article>
            <span>Internal Support</span>
            <strong>{formatCurrency(internalRaised)}</strong>
            <p>Admin-logged support and adjustments.</p>
          </article>
          <article>
            <span>Remaining To Goal</span>
            <strong>{formatCurrency(remaining)}</strong>
            <p>Based on the active campaign target.</p>
          </article>
        </div>

        <div className="transparency-progress-card">
          <div>
            <span>Campaign Progress</span>
            <strong>{formatPercentage(percent)}%</strong>
          </div>
          <div className="progress-bar" aria-label="Campaign transparency progress">
            <span style={{ width: `${Math.max(0, Math.min(percent, 100))}%` }} />
          </div>
          <p>Last updated {lastUpdated}.</p>
        </div>
      </section>

      <div className="transparency-info-grid">
        <section className="page-panel transparency-info-panel">
          <p className="eyebrow">What This Shows</p>
          <h2>Report contents</h2>
          <ul>
            {reportItems.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>

        <section className="page-panel transparency-info-panel">
          <p className="eyebrow">Why It Exists</p>
          <h2>Transparency principles</h2>
          <ul>
            {principles.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      </div>

      <section className="page-panel transparency-status-panel">
        <p className="eyebrow">Records and Proof</p>
        <h2>Liquidation records hold the supporting documents.</h2>
        <p>
          Expense proof, captions, and report links are posted under Liquidation Records as campaign expenses are finalized. This page stays as the clean overview, while detailed proof lives in the records area.
        </p>
        <div className="transparency-action-grid">
          <Link className="transparency-action-card" to="/updates?tab=liquidation">
            <FiArchive aria-hidden="true" />
            <strong>Liquidation Records</strong>
            <span>View posted proofs and report links.</span>
          </Link>
          <Link className="transparency-action-card" to="/campaigns">
            <FiTrendingUp aria-hidden="true" />
            <strong>Campaign Archive</strong>
            <span>Review active and completed campaign records.</span>
          </Link>
          <Link className="transparency-action-card" to="/lookup">
            <FiFileText aria-hidden="true" />
            <strong>Donation Lookup</strong>
            <span>Check a submitted donation code.</span>
          </Link>
        </div>
      </section>
    </section>
  );
}
