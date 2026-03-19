import { FiArrowUpRight, FiClock, FiTarget, FiTrendingUp } from "react-icons/fi";
import { Link } from "react-router-dom";
import { formatCurrency } from "../../services/format";
import { CampaignItem, ProgressStats, UpdateItem } from "../../types/content";
import { SectionHeading } from "../shared/SectionHeading";

type CampaignPulseSectionProps = {
  campaign: CampaignItem;
  progress: ProgressStats;
  updates: UpdateItem[];
};

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

export function CampaignPulseSection({ campaign, progress, updates }: CampaignPulseSectionProps) {
  const latestUpdate = updates.find((item) => item.label !== "Past Campaign") ?? updates[0];
  const remaining = Math.max(progress.goal - progress.totalRaised, 0);

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
          <strong>{formatCurrency(progress.totalRaised)}</strong>
          <p className="pulse-copy">
            {progress.goal > 0
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
              ? `${latestUpdate.platform} • ${formatUpdateDate(latestUpdate.date)}`
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
