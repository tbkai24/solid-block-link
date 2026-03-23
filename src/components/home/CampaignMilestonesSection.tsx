import { formatCurrency, formatPercentage } from "../../services/format";
import { FiUsers } from "react-icons/fi";
import { CampaignMilestoneItem } from "../../types/content";
import { SectionHeading } from "../shared/SectionHeading";

type CampaignMilestonesSectionProps = {
  milestones?: CampaignMilestoneItem[];
  compact?: boolean;
};

export function CampaignMilestonesSection({ milestones, compact = false }: CampaignMilestonesSectionProps) {
  const safeMilestones = Array.isArray(milestones) ? milestones : [];
  const getMilestoneBadge = (status?: string, raisedAmount = 0, targetAmount = 0) => {
    if (targetAmount > 0 && raisedAmount >= targetAmount) return "Achieved";
    const normalizedStatus = String(status ?? "").trim().toLowerCase();
    return normalizedStatus === "completed" || normalizedStatus === "achieved" ? "Achieved" : "Ongoing";
  };
  const sortedMilestones = [...safeMilestones].sort((left, right) => {
    const leftBadge = getMilestoneBadge(left.status, left.raisedAmount, left.targetAmount);
    const rightBadge = getMilestoneBadge(right.status, right.raisedAmount, right.targetAmount);

    if (leftBadge !== rightBadge) {
      return leftBadge === "Ongoing" ? -1 : 1;
    }

    return (left.displayOrder ?? 0) - (right.displayOrder ?? 0);
  });
  const visibleMilestones = compact ? sortedMilestones.slice(0, 2) : sortedMilestones;

  return (
    <section className="content-section">
      <SectionHeading
        eyebrow="Campaign Milestones"
        title={compact ? "Campaign stages within one goal" : "Milestone progress within this campaign"}
        copy={
          compact
            ? "Each milestone can carry its own target while still contributing to the same overall campaign."
            : "Milestones stay under the same campaign while tracking distinct targets for clearer reporting."
        }
      />

      {visibleMilestones.length ? (
        <div className={compact ? "campaign-milestones-grid compact" : "campaign-milestones-grid"}>
          {visibleMilestones.map((item) => (
            <article className="campaign-milestone-card" key={item.id}>
              <div className="campaign-milestone-head">
                <span className="chip">{getMilestoneBadge(item.status, item.raisedAmount, item.targetAmount)}</span>
              </div>
              <h3>{item.title}</h3>
              <div className="campaign-milestone-metrics">
                <div>
                  <span className="label">Raised</span>
                  <strong>{formatCurrency(item.raisedAmount)}</strong>
                </div>
                <div className="campaign-milestone-side">
                  <span className="label">Target</span>
                  <strong>{formatCurrency(item.targetAmount)}</strong>
                </div>
              </div>
              <div className="progress-bar" aria-label={`${item.title} progress`}>
                <span style={{ width: `${Math.max(0, Math.min(item.percent, 100))}%` }} />
              </div>
              <div className="campaign-milestone-foot">
                <span className="label">{formatPercentage(item.percent)}% funded</span>
                <span className="campaign-milestone-meta">
                  <FiUsers aria-hidden="true" />
                  {item.donorCount} donors
                </span>
              </div>
              {item.note ? <p className="campaign-milestone-note">{item.note}</p> : null}
            </article>
          ))}
        </div>
      ) : (
        <article className="milestone-history-empty">
          <span className="chip milestone-history-chip">No Entries Yet</span>
          <strong>No campaign milestones yet</strong>
          <p>Add milestone rows in the admin panel to define separate targets and cutoff ranges under this campaign.</p>
        </article>
      )}
    </section>
  );
}
