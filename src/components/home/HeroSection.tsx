import { FiArrowRight, FiSearch, FiUsers, FiShield } from "react-icons/fi";
import { Link } from "react-router-dom";

import { CampaignItem, SiteContent } from "../../types/content";

type HeroSectionProps = {
  content: SiteContent;
  campaign?: CampaignItem;
  donateHref?: string;
};

const heroTickerTop = ["NSG", "YouTube Streamers", "TikTok Hub", "SBL Creatives", "SBL Audit & Finance", "SBL Marketing"];
const heroTickerBottom = ["SBL USA", "SBL Canada", "SBL LATAM", "SBL Oceania", "SBL Philippines", "Global A'TIN"];

function isInternalHref(href: string) {
  return href.startsWith("/");
}

export function HeroSection({ content, campaign, donateHref }: HeroSectionProps) {
  const { heroTitle, heroSummary, donateCta, lookupCta, currentCampaign } = content;
  const visibleCampaign = campaign ?? currentCampaign;
  const hasActiveCampaign = Boolean(campaign?.id && campaign.title.trim());
  const campaignSummary = hasActiveCampaign ? visibleCampaign.summary.trim() : "";
  const resolvedDonateHref = donateHref || visibleCampaign.donateUrl || donateCta.href;

  return (
    <section className="hero-panel motion-hero">
      <div className="motion-hero-bg" aria-hidden="true">
        <div className="motion-hero-row motion-hero-row-top">
          {[...heroTickerTop, ...heroTickerTop].map((item, index) => (
            <span key={`${item}-${index}`}>{item}</span>
          ))}
        </div>
        <div className="motion-hero-row motion-hero-row-bottom">
          {[...heroTickerBottom, ...heroTickerBottom].map((item, index) => (
            <span key={`${item}-${index}`}>{item}</span>
          ))}
        </div>
      </div>
      <div className="hero-copy">
        <span className="eyebrow">Marketing and Donation Hub</span>
        <h1>
          <span className="hero-title-line">SOLID BLOCK</span>
          <span className="hero-title-line">LINK</span>
        </h1>
        <p>{heroSummary}</p>
        <div className="cta-row">
          {hasActiveCampaign ? (
            <a className="button primary" href={resolvedDonateHref} target="_blank" rel="noreferrer">
              <span className="button-icon" aria-hidden="true"><FiArrowRight /></span>
              {donateCta.label}
            </a>
          ) : null}
          {isInternalHref(lookupCta.href) ? (
            <Link className="button secondary" to={lookupCta.href}>
              <span className="button-icon" aria-hidden="true"><FiSearch /></span>
              {lookupCta.label}
            </Link>
          ) : (
            <a className="button secondary" href={lookupCta.href} target="_blank" rel="noreferrer">
              <span className="button-icon" aria-hidden="true"><FiSearch /></span>
              {lookupCta.label}
            </a>
          )}
        </div>
      </div>
      <div className="hero-card">
        <p className={hasActiveCampaign ? "hero-card-label breathing-active-chip" : "hero-card-label"}>{hasActiveCampaign ? "Active campaign" : "Campaign status"}</p>
        <h2>{hasActiveCampaign ? visibleCampaign.title : "No active campaign"}</h2>
        <p>
          {campaignSummary || "Campaign records and completed drives are available in the campaign archive."}
        </p>
      </div>
    </section>
  );
}
