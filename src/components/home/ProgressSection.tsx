import { useEffect, useState } from "react";
import { FiArrowRight, FiDollarSign, FiTarget, FiTrendingUp, FiUsers } from "react-icons/fi";
import { formatCurrency, formatPercentage, formatViewerDateTime } from "../../services/format";
import { CtaLink, MilestoneContent, ProgressStats } from "../../types/content";
import { SectionHeading } from "../shared/SectionHeading";

type ProgressSectionProps = {
  progress: ProgressStats;
  donateCta: CtaLink;
  campaignTitle: string;
  milestone: MilestoneContent;
  donateHref?: string;
};

export function ProgressSection({ progress, donateCta, campaignTitle, milestone, donateHref }: ProgressSectionProps) {
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState(() => formatViewerDateTime(new Date()));
  const internalDonorCount = progress.internalDonorCount ?? 0;
  const totalDonorCount = progress.donorCount + internalDonorCount;
  const amountNeeded = Math.max(progress.goal - progress.totalRaised, 0);
  const resolvedDonateHref = donateHref || donateCta.href;

  useEffect(() => {
    setLastUpdatedLabel(formatViewerDateTime(new Date()));
  }, [progress.totalRaised, progress.publicRaised, progress.internalRaised, progress.donorCount, internalDonorCount, progress.goal, progress.percent]);

  const stats = [
    { label: "Goal", value: formatCurrency(progress.goal), icon: <FiTarget /> },
    { label: "Donors", value: totalDonorCount.toString(), icon: <FiUsers /> },
    { label: "Public Donations", value: formatCurrency(progress.publicRaised), icon: <FiTrendingUp /> },
    { label: "Internal Donations", value: formatCurrency(progress.internalRaised), icon: <FiDollarSign /> }
  ];

  return (
    <section className="content-section" id="donation-progress">
      <SectionHeading eyebrow="Donation Drive" title="Live donation progress" copy="One campaign total combining verified public donations and admin-tracked internal support." />
      <div className="donation-hero-panel">
        <div className="donation-hero-copy">
          <span className="label">Active campaign</span>
          <h3>{campaignTitle}</h3>
          <p className="donation-total">{formatCurrency(progress.totalRaised)}</p>
          <p className="muted-text">Raised so far</p>
          <div className="cta-row">
            <a className="button primary" href={resolvedDonateHref} target="_blank" rel="noreferrer">
              <span className="button-icon" aria-hidden="true"><FiArrowRight /></span>
              {donateCta.label}
            </a>
          </div>
          {milestone.isVisible ? (
            <p className="milestone-note">
              {milestone.title}
            </p>
          ) : null}
        </div>
        <div className="donation-summary">
          <div className="progress-copy">
            <div className="progress-metric progress-side-value">
              <span className="progress-amount-needed">{formatCurrency(amountNeeded)} needed</span>
            </div>
            <div className="progress-metric">
              <span className="label">Progress</span>
              <strong>{formatPercentage(progress.percent)}%</strong>
            </div>
          </div>
          <div className="progress-bar" aria-label="Donation progress">
            <span style={{ width: `${progress.percent}%` }} />
          </div>
          <div className="trust-row">
            <span className="trust-chip">Verified sheet totals</span>
            <span className="trust-chip">Internal support included</span>
            <span className="trust-chip">Last updated {lastUpdatedLabel}</span>
          </div>
        </div>
      </div>
      <div className="stats-grid compact">
        {stats.map((stat) => (
          <article className="stat-card" key={stat.label}>
            <span className="stat-icon" aria-hidden="true">{stat.icon}</span>
            <span className="label">{stat.label}</span>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

export default ProgressSection;
