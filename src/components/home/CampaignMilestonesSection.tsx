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
// In CampaignMilestonesSection.tsx

const getMilestoneBadge = (status?: string, raisedAmount = 0, targetAmount = 0) => {
  const normalizedStatus = String(status ?? "").trim().toLowerCase();

  if (normalizedStatus === "not achieved") {
    return "Not Achieved";
  }

  if (normalizedStatus === "completed" || normalizedStatus === "achieved") {
    return "Achieved";
  }

  if (targetAmount > 0 && raisedAmount >= targetAmount) return "Achieved";

  return "Ongoing";
};

const getMilestoneChipClass = (badge: string, compact: boolean) => {
  const normalized = badge.trim().toLowerCase();

  if (compact && normalized === "ongoing") return "chip breathing-active-chip";
  if (normalized === "not achieved") return "chip status-chip-not-achieved";
  if (normalized === "achieved" || normalized === "completed") return "chip status-chip-completed";

  return "chip";
};
  // In CampaignMilestonesSection.tsx

  const sortedMilestones = [...safeMilestones].sort((left, right) => {
    const leftBadge = getMilestoneBadge(left.status, left.raisedAmount, left.targetAmount);
    const rightBadge = getMilestoneBadge(right.status, right.raisedAmount, right.targetAmount);


    const isLeftPriority = leftBadge === "Ongoing" || leftBadge === "Not Achieved";
    const isRightPriority = rightBadge === "Ongoing" || rightBadge === "Not Achieved";

    if (isLeftPriority !== isRightPriority) {
      return isLeftPriority ? -1 : 1;
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
          {visibleMilestones.map((item) => {
            const badge = getMilestoneBadge(item.status, item.raisedAmount, item.targetAmount);

            return (
            <article className="campaign-milestone-card" key={item.id}>
              <div className="campaign-milestone-head">
                <span className={getMilestoneChipClass(badge, compact)}>{badge}</span>
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
            );
          })}
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
