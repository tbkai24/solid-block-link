import { FiExternalLink, FiShield, FiHeart, FiRefreshCw, FiTarget, FiTrendingUp, FiUsers } from "react-icons/fi";
import { Link } from "react-router-dom";
import { faqItems } from "../../data/faqs";
import { formatCurrency, formatPercentage, formatViewerDateTime } from "../../services/format";
import { HomepageCampaignItem, SiteContent } from "../../types/content";
import { CampaignMilestonesSection } from "./CampaignMilestonesSection";

type OneStopHubSectionProps = {
  content: SiteContent;
  activeCampaign?: HomepageCampaignItem;
  activeDonateHref: string;
};

const tickerItems = ["SB19", "A'TIN", "Donation Drives", "Campaign Records", "Global Promo", "Updates"];

function isInternalHref(href: string) {
  return href.startsWith("/");
}

export function OneStopHubSection({ content, activeCampaign, activeDonateHref }: OneStopHubSectionProps) {
  const progress = activeCampaign?.progress ?? content.progress;
  const totalDonors = Number(progress.donorCount ?? 0) + Number(progress.internalDonorCount ?? 0);
  const amountNeeded = Math.max(Number(progress.goal ?? 0) - Number(progress.totalRaised ?? 0), 0);
  const lastUpdated = formatViewerDateTime(progress.lastUpdated) || "refreshing with live data";
  const donorBreakdown = `Public ${progress.donorCount ?? 0} • Internal ${progress.internalDonorCount ?? 0}`;

  return (
    <section className="one-stop-hub" aria-label="Solid Block Link one stop hub">
      <div className="hub-ticker" aria-hidden="true">
        <div className="hub-ticker-track">
          {[...tickerItems, ...tickerItems].map((item, index) => (
            <span key={`${item}-${index}`}>{item}</span>
          ))}
        </div>
      </div>

      <div className="hub-action-grid" id="donate">
        <a className="hub-action primary" href={activeDonateHref} target="_blank" rel="noreferrer">
          <span className="hub-action-icon" aria-hidden="true"><FiHeart /></span>
          <strong>Donate</strong>
          <span>Join the active drive and help move the campaign forward.</span>
        </a>
        {isInternalHref(content.lookupCta.href) ? (
          <Link className="hub-action" to={content.lookupCta.href}>
            <span className="hub-action-icon" aria-hidden="true"><FiRefreshCw /></span>
            <strong>Track Donation</strong>
            <span>Use the SBL lookup link to check submitted donation records.</span>
          </Link>
        ) : (
          <a className="hub-action" href={content.lookupCta.href} target="_blank" rel="noreferrer">
            <span className="hub-action-icon" aria-hidden="true"><FiRefreshCw /></span>
            <strong>Track Donation</strong>
            <span>Use the SBL lookup link to check submitted donation records.</span>
          </a>
        )}
        <Link className="hub-action" to="/updates">
          <span className="hub-action-icon" aria-hidden="true"><FiExternalLink /></span>
          <strong>Updates</strong>
          <span>See the latest social posts and admin-curated announcements.</span>
        </Link>
      </div>

      <div className="hub-section-grid compact-home-grid">
        <section className="hub-panel donation-panel" id="donation-progress">
          <p className={activeCampaign ? "eyebrow breathing-active-chip" : "eyebrow"}>Donation Drive</p>
          <h2>Live donation progress</h2>
          <div className="donation-live-card">
            <span className="label">Current donation project</span>
            <strong>{activeCampaign?.title || content.currentCampaign.title || "Current SBL campaign"}</strong>
            <p className="donation-live-total">{formatCurrency(progress.totalRaised)}</p>
            <div className="progress-bar" aria-label="Donation progress">
              <span style={{ width: `${Math.max(0, Math.min(progress.percent, 100))}%` }} />
            </div>
           <div className="donation-live-stats">
  <div>
    <FiTarget aria-hidden="true" />
    <span>Goal</span>
    <strong>{formatCurrency(progress.goal)}</strong>
  </div>
  <div>
    <FiUsers aria-hidden="true" />
    <span>Donors</span>
    <strong>{totalDonors}</strong>
    <div className="donor-breakdown-row">
      <span className="donor-pill"><FiUsers aria-hidden="true" /> Public {progress.donorCount ?? 0}</span>
      <span className="donor-pill"><FiShield aria-hidden="true" /> Internal {progress.internalDonorCount ?? 0}</span>
    </div>
  </div>
  <div>
    <FiTrendingUp aria-hidden="true" />
    <span>Progress</span>
    <strong>{formatPercentage(progress.percent)}%</strong>
  </div>
</div>
            <p className="muted-text">
              {formatCurrency(amountNeeded)} needed. Last updated {lastUpdated}.
            </p>
          </div>
          <a className="button primary" href={activeDonateHref} target="_blank" rel="noreferrer">
            <span className="button-icon" aria-hidden="true"><FiHeart /></span>
            {content.donateCta.label}
          </a>
        </section>
      </div>

      {activeCampaign ? (
        <CampaignMilestonesSection milestones={activeCampaign.campaignMilestones} compact />
      ) : null}

      <section className="about-sbl-panel" id="about-sbl">
        <div className="about-sbl-visual" aria-hidden="true">
          <img src="/sbllogo.jpg" alt="" />
        </div>
        <div className="about-sbl-copy">
          <p className="eyebrow">What is Solid Block Link?</p>
          <h2>One home for SBL campaigns, donations, projects, and reports.</h2>
          <p>
            Solid Block Link is a fan-powered marketing and donation hub built to support SB19 through organized campaign action, transparent fund tracking, and easy-to-follow supporter updates.
          </p>
          <ul>
            <li><strong>Bond.</strong> Bring supporters into one coordinated space.</li>
            <li><strong>Support.</strong> Make donation and campaign actions clear.</li>
            <li><strong>Connect.</strong> Keep fans updated through projects, reports, and social links.</li>
          </ul>
        </div>
      </section>

      <section className="faq-band" id="faq">
        <h2>FAQ</h2>
        <div className="faq-list">
          {faqItems.map((item) => (
            <details key={item.question}>
              <summary>{item.question}<span>+</span></summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

    </section>
  );
}
