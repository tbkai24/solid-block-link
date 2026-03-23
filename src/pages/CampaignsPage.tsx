import { CampaignMilestonesSection } from "../components/home/CampaignMilestonesSection";
import { Link } from "react-router-dom";
import { useSiteContent } from "../hooks/useSiteContent";

export function CampaignsPage() {
  const { content, loading, error, hasContent } = useSiteContent();

  if (!hasContent && loading && !error) {
    return (
      <section className="page-panel site-loading-panel">
        <p className="eyebrow">Campaigns</p>
        <h1>Loading campaign direction</h1>
        <p className="page-lead">The latest campaign details are on the way.</p>
      </section>
    );
  }

  return (
    <section className="page-shell">
      <div className="page-panel page-hero-panel">
        <p className="eyebrow">Campaigns</p>
        <h1>Active campaign direction</h1>
        <p className="page-lead">
          Explore the current public campaign, its objective, and the fundraising focus supporting SB19&apos;s global momentum.
        </p>
      </div>

      <div className="page-grid">
        <article className="page-panel campaign-feature-panel">
          <p className="chip">{content.currentCampaign.status}</p>
          <h2>{content.currentCampaign.title}</h2>
          <p>{content.currentCampaign.summary}</p>
          <div className="cta-row campaign-page-actions">
            <Link className="button primary" to="/#donation-progress">
              View Donation Progress
            </Link>
          </div>
        </article>

        <aside className="page-panel campaign-side-panel">
          <p className="label">Campaign outcome</p>
          <strong>{content.currentCampaign.outcome || "Ongoing push"}</strong>
          <p className="muted-text">This space keeps the public-facing campaign message focused and easy to scan.</p>
        </aside>
      </div>

      <CampaignMilestonesSection milestones={content.campaignMilestones} />
    </section>
  );
}
