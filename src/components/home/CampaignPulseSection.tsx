import { FiArrowUpRight, FiClock, FiTarget, FiTrendingUp } from "react-icons/fi";
import { Link } from "react-router-dom";
import { formatCurrency } from "../../services/format";
import { CampaignItem, CampaignMilestoneItem, ProgressStats, UpdateItem } from "../../types/content";
import { SectionHeading } from "../shared/SectionHeading";

type CampaignPulseSectionProps = {
  campaign: CampaignItem;
  milestones: CampaignMilestoneItem[];
  progress: ProgressStats;
  updates: UpdateItem[];
};

function getMilestoneState(item: CampaignMilestoneItem) {
  const normalizedStatus = String(item.status ?? "").trim().toLowerCase();
  if (item.targetAmount > 0 && item.raisedAmount >= item.targetAmount) return "Achieved";
  return normalizedStatus === "completed" || normalizedStatus === "achieved" ? "Achieved" : "Ongoing";
}

function formatUpdateDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export function CampaignPulseSection({ campaign, milestones, progress, updates }: CampaignPulseSectionProps) {
  const safeUpdates = Array.isArray(updates) ? updates : [];
  const safeMilestones = Array.isArray(milestones) ? milestones : [];
  const latestUpdate = safeUpdates.find((item) => item.label !== "Past Campaign") ?? safeUpdates[0];
  const sortedMilestones = [...safeMilestones].sort((left, right) => {
    const leftState = getMilestoneState(left);
    const rightState = getMilestoneState(right);

    if (leftState !== rightState) {
      return leftState === "Ongoing" ? -1 : 1;
    }

    return (left.displayOrder ?? 0) - (right.displayOrder ?? 0);
  });
  const currentMilestone = sortedMilestones.find((item) => getMilestoneState(item) === "Ongoing") ?? sortedMilestones[0];
  const remaining = Math.max(progress.goal - progress.totalRaised, 0);
  const milestoneRemaining = currentMilestone
    ? Math.max(currentMilestone.targetAmount - currentMilestone.raisedAmount, 0)
    : 0;

  return (
    <section className="content-section">
      <SectionHeading
        eyebrow="Campaign Pulse"
        title="Interactive campaign highlights"
        copy="A quicker way to scan where the push stands, what needs support next, and where the latest momentum is coming from."
      />
      <div className="pulse-grid">
        <Link className="pulse-card pulse-card-primary" to="/#donation-progress">
          <span className="pulse-icon" aria-hidden="true"><FiTrendingUp /></span>
          <p className="pulse-kicker">Live momentum</p>
          <strong>{currentMilestone ? currentMilestone.title : formatCurrency(progress.totalRaised)}</strong>
          <p className="pulse-copy">
            {currentMilestone
              ? `${formatCurrency(milestoneRemaining)} remaining to reach ${formatCurrency(currentMilestone.targetAmount)}.`
              : progress.goal > 0
                ? `${formatCurrency(remaining)} remaining to reach the current goal.`
                : "Track the live total and see how public and internal support are building together."}
          </p>
          <span className="pulse-link">
            Open progress
            <FiArrowUpRight />
          </span>
        </Link>

        <Link className="pulse-card" to="/campaigns">
          <span className="pulse-icon" aria-hidden="true"><FiTarget /></span>
          <p className="pulse-kicker">Current focus</p>
          <strong>{campaign.title}</strong>
          <p className="pulse-copy">
            {campaign.summary || "Open the campaign page for the full public-facing direction behind the current push."}
          </p>
          <span className="pulse-link">
            View campaign
            <FiArrowUpRight />
          </span>
        </Link>

        <Link className="pulse-card" to="/updates">
          <span className="pulse-icon" aria-hidden="true"><FiClock /></span>
          <p className="pulse-kicker">Latest signal</p>
          <strong>{latestUpdate ? latestUpdate.title : "Awaiting next update"}</strong>
          <p className="pulse-copy">
            {latestUpdate
              ? `${latestUpdate.platform} - ${formatUpdateDate(latestUpdate.date)}`
              : "Social proof and update recaps will surface here as soon as they are published."}
          </p>
          <span className="pulse-link">
            Browse updates
            <FiArrowUpRight />
          </span>
        </Link>
      </div>
    </section>
  );
}
