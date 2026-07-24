import { useState } from "react";
import { FiActivity, FiArchive, FiChevronDown, FiShield, FiTrendingUp, FiUsers } from "react-icons/fi";
import { Link } from "react-router-dom";
import { CampaignMilestonesSection } from "../components/home/CampaignMilestonesSection";
import { formatCurrency, formatPercentage } from "../services/format";
import { CampaignItem, HomepageCampaignItem } from "../types/content";
import { useSiteContent } from "../hooks/useSiteContent";

function hasCampaignDetails(campaign?: { id?: string; title?: string }) {
  return Boolean(campaign?.id && campaign.title?.trim());
}

function getCampaignResult(campaign: CampaignItem) {
  if (campaign.status === "Active") return "Ongoing";
  if (campaign.status === "Not Achieved") return campaign.outcome.trim() || "Not Achieved";
  if (campaign.outcome.trim()) return campaign.outcome;
  return "Completed";
}

function getAllCampaigns(content: ReturnType<typeof useSiteContent>["content"]) {
  const campaigns = new Map<string, CampaignItem | HomepageCampaignItem>();

  content.pastCampaigns.forEach((campaign) => {
    if (hasCampaignDetails(campaign)) {
      campaigns.set(campaign.id, campaign);
    }
  });

  if (hasCampaignDetails(content.currentCampaign)) {
    const existing = campaigns.get(content.currentCampaign.id);
    campaigns.set(content.currentCampaign.id, {
      ...existing,
      ...content.currentCampaign,
      publicAmount: content.progress.publicRaised || existing?.publicAmount || content.currentCampaign.publicAmount,
      internalAmount: content.progress.internalRaised || existing?.internalAmount || content.currentCampaign.internalAmount,
      donorCount: content.progress.donorCount || existing?.donorCount || content.currentCampaign.donorCount,
      internalDonorCount: content.progress.internalDonorCount || existing?.internalDonorCount || content.currentCampaign.internalDonorCount,
      progress: content.progress,
      milestone: content.milestone,
      campaignMilestones: content.campaignMilestones,
      milestoneCount: content.campaignMilestones.length
    } satisfies HomepageCampaignItem);
  }

  content.homepageCampaigns.forEach((campaign) => {
    if (hasCampaignDetails(campaign)) {
      const existing = campaigns.get(campaign.id);
      campaigns.set(campaign.id, {
        ...existing,
        ...campaign,
        publicAmount: campaign.progress.publicRaised || existing?.publicAmount || campaign.publicAmount,
        internalAmount: campaign.progress.internalRaised || existing?.internalAmount || campaign.internalAmount,
        donorCount: campaign.progress.donorCount || existing?.donorCount || campaign.donorCount,
        internalDonorCount: campaign.progress.internalDonorCount || existing?.internalDonorCount || campaign.internalDonorCount
      });
    }
  });

  return Array.from(campaigns.values()).sort((left, right) => {
    if (left.status !== right.status) return left.status === "Active" ? -1 : 1;
    return left.title.localeCompare(right.title);
  });
}

function hasCampaignProgress(campaign: CampaignItem | HomepageCampaignItem): campaign is HomepageCampaignItem {
  return "progress" in campaign;
}

function getRaisedAmount(campaign: CampaignItem | HomepageCampaignItem) {
  if (hasCampaignProgress(campaign)) return campaign.progress.totalRaised;
  return Number(campaign.publicAmount ?? 0) + Number(campaign.internalAmount ?? 0);
}

function getGoalAmount(campaign: CampaignItem | HomepageCampaignItem) {
  if (hasCampaignProgress(campaign)) return campaign.progress.goal;
  return Number(campaign.goalAmount ?? 0);
}

function getPublicDonorCount(campaign: CampaignItem | HomepageCampaignItem) {
  if (hasCampaignProgress(campaign)) return campaign.progress.donorCount;
  return Number(campaign.donorCount ?? 0);
}

function getInternalDonorCount(campaign: CampaignItem | HomepageCampaignItem) {
  if (hasCampaignProgress(campaign)) return campaign.progress.internalDonorCount ?? 0;
  return Number(campaign.internalDonorCount ?? 0);
}

function getCampaignMilestones(campaign: CampaignItem | HomepageCampaignItem) {
  return Array.isArray(campaign.campaignMilestones) ? campaign.campaignMilestones : [];
}

function getStatusChipClass(status?: string) {
  const normalized = String(status ?? "").trim().toLowerCase();

  if (normalized === "active" || normalized === "ongoing") return "chip breathing-active-chip";
  if (normalized === "not achieved") return "chip status-chip-not-achieved";
  if (normalized === "completed" || normalized === "achieved") return "chip status-chip-completed";
  if (normalized === "upcoming") return "chip status-chip-upcoming";

  return "chip";
}

export function CampaignsPage() {
  const { content, loading, error, hasContent } = useSiteContent();
  const campaigns = getAllCampaigns(content);
  const activeCampaigns = campaigns.filter((campaign) => campaign.status === "Active");
  const firstCampaignWithMilestones = campaigns.find((campaign) => hasCampaignProgress(campaign) && campaign.campaignMilestones.length);
  const [expandedCampaignIds, setExpandedCampaignIds] = useState<string[]>([]);

  function toggleCampaign(campaignId: string) {
    setExpandedCampaignIds((current) =>
      current.includes(campaignId)
        ? current.filter((id) => id !== campaignId)
        : [...current, campaignId]
    );
  }

  if (!hasContent && loading && !error) {
    return (
      <section className="page-panel site-loading-panel">
        <p className="eyebrow">Campaigns</p>
        <h1>Loading campaign archive</h1>
        <p className="page-lead">The latest campaign records are on the way.</p>
      </section>
    );
  }

  return (
    <section className="page-shell">
      <div className="page-panel page-hero-panel">
        <p className="eyebrow">Campaigns</p>
        <h1>Campaign archive and current drives</h1>
        <p className="page-lead">
          Review every public campaign in one place, including active drives, completed projects, and campaigns that did not reach target.
        </p>
      </div>

      {error ? <section className="page-panel"><p>{error}</p></section> : null}

      <div className="campaign-archive-summary">
        <article className="stat-card">
          <span className="stat-icon" aria-hidden="true"><FiActivity /></span>
          <span className="label">Active</span>
          <strong>{activeCampaigns.length}</strong>
        </article>
        <article className="stat-card">
          <span className="stat-icon" aria-hidden="true"><FiArchive /></span>
          <span className="label">Total Records</span>
          <strong>{campaigns.length}</strong>
        </article>
        <article className="stat-card">
          <span className="stat-icon" aria-hidden="true"><FiTrendingUp /></span>
          <span className="label">Current Raised</span>
          <strong>{formatCurrency(content.progress.totalRaised)}</strong>
        </article>
      </div>

      {campaigns.length ? (
        <div className="campaign-archive-list">
          {campaigns.map((campaign) => {
            const hasProgress = hasCampaignProgress(campaign);
            const progress = hasProgress ? campaign.progress : null;
            const raisedAmount = getRaisedAmount(campaign);
            const goalAmount = getGoalAmount(campaign);
            const publicDonorCount = getPublicDonorCount(campaign);
            const internalDonorCount = getInternalDonorCount(campaign);
            const totalDonorCount = publicDonorCount + internalDonorCount;
            const progressPercent = progress?.percent ?? (goalAmount > 0 ? Math.min(Math.round(((raisedAmount / goalAmount) * 100) * 100) / 100, 100) : 0);
            const isExpanded = expandedCampaignIds.includes(campaign.id);
            const milestones = getCampaignMilestones(campaign);

            return (
              <article className="page-panel campaign-archive-card compact" id={campaign.id} key={campaign.id}>
                <div className="campaign-archive-main">
                  <div className="campaign-archive-meta">
                    <span className={getStatusChipClass(campaign.status)}>{campaign.status}</span>
                    <span className="label">{getCampaignResult(campaign)}</span>
                  </div>
                  <h2>{campaign.title}</h2>
                  <div className="campaign-archive-quick-stats">
                    <div>
                      <span className="label">Raised</span>
                      <strong>{formatCurrency(raisedAmount)}</strong>
                    </div>
                    <div>
                      <span className="label">Goal</span>
                      <strong>{goalAmount > 0 ? formatCurrency(goalAmount) : "Not set"}</strong>
                    </div>
                 <div className="campaign-donor-breakdown">
                <div>
                  <span className="label">Public Donors</span>
                  <strong><FiUsers aria-hidden="true" /> {publicDonorCount}</strong>
                </div>
                <div>
                  <span className="label">Internal Donors</span>
                  <strong><FiShield aria-hidden="true" /> {internalDonorCount}</strong>
                </div>
                <div>
                  <span className="label">Total Donors</span>
                  <strong>{totalDonorCount}</strong>
                </div>
              </div>
                                </div>
                </div>

                <button
                  className={`campaign-expand-button${isExpanded ? " active" : ""}`}
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() => toggleCampaign(campaign.id)}
                >
                  {isExpanded ? "Hide summary" : "View summary"}
                  <FiChevronDown aria-hidden="true" />
                </button>

                {isExpanded ? (
                  <div className="campaign-archive-details">
                    <p>{campaign.summary || "Campaign details will be added soon."}</p>
                    {campaign.outcome ? <strong className="card-outcome">{campaign.outcome}</strong> : null}
                  </div>
                ) : null}

                {isExpanded && milestones.length ? (
                  <div className="campaign-archive-milestones">
                    <span className="label">Milestones</span>
                    <div className="campaign-archive-milestone-list">
                      {milestones.map((milestone) => (
                        <article className="campaign-archive-milestone" key={milestone.id}>
                          <div className="campaign-archive-milestone-head">
                            <strong>{milestone.title}</strong>
                            <span className={getStatusChipClass(milestone.status)}>{milestone.status}</span>
                          </div>
                       <div className="campaign-archive-milestone-stats">
                        <span>{formatCurrency(milestone.raisedAmount)} raised</span>
                        <span>{formatCurrency(milestone.targetAmount)} target</span>
                        <span><FiUsers aria-hidden="true" /> {milestone.donorCount} donors</span>
                      </div>
                          <div className="progress-bar" aria-label={`${milestone.title} milestone progress`}>
                            <span style={{ width: `${Math.max(0, Math.min(milestone.percent, 100))}%` }} />
                          </div>
                          <p className="muted-text">{formatPercentage(milestone.percent)}% funded</p>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null}

                      {isExpanded && (progress || goalAmount > 0 || raisedAmount > 0) ? (
            <div className="campaign-archive-progress">
              <span className="label">Raised</span>
              <strong>{formatCurrency(raisedAmount)}</strong>
              <div className="progress-bar" aria-label={`${campaign.title} progress`}>
                <span style={{ width: `${progressPercent}%` }} />
              </div>
              <p className="muted-text">
                {goalAmount > 0 ? `${formatPercentage(progressPercent)}% of ${formatCurrency(goalAmount)}` : "Goal not set"}
              </p>
              <div className="campaign-donor-breakdown">
                <span className="trust-chip"><FiUsers aria-hidden="true" /> Public: {publicDonorCount}</span>
                <span className="trust-chip"><FiShield aria-hidden="true" /> Internal: {internalDonorCount}</span>
              </div>
            </div>
          ) : null}

                {isExpanded && campaign.status === "Active" && campaign.donateUrl ? (
                  <div className="cta-row">
                    <a className="button primary" href={campaign.donateUrl} target="_blank" rel="noreferrer">Donate</a>
                    <Link className="button secondary" to="/#donation-progress">View Progress</Link>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <section className="page-panel">
          <h2>No campaign records yet</h2>
          <p className="muted-text">Campaigns will appear here once they are added in the admin panel.</p>
        </section>
      )}

      {firstCampaignWithMilestones && hasCampaignProgress(firstCampaignWithMilestones) ? (
        <CampaignMilestonesSection milestones={firstCampaignWithMilestones.campaignMilestones} />
      ) : null}
    </section>
  );
}
