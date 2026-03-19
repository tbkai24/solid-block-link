import { FiArrowRight, FiSearch } from "react-icons/fi";
import { SiteContent } from "../../types/content";

type HeroSectionProps = {
  content: SiteContent;
};

function renderHeroTitle(title: string) {
  const [prefix, suffix] = title.includes(":") ? title.split(/:\s*/, 2) : [title, ""];
  const tailLines = suffix
    ? suffix
        .split(". ")
        .map((line, index, lines) => (index < lines.length - 1 && !line.endsWith(".") ? `${line}.` : line))
        .filter(Boolean)
    : [];

  return (
    <>
      <span className="hero-title-line">{suffix ? `${prefix}:` : prefix}</span>
      {tailLines.map((line) => (
        <span className="hero-title-line" key={line}>
          {line}
        </span>
      ))}
    </>
  );
}

export function HeroSection({ content }: HeroSectionProps) {
  const { heroTitle, heroSummary, donateCta, lookupCta, currentCampaign } = content;
  const campaignSummary = currentCampaign.summary.trim();

  return (
    <section className="hero-panel">
      <div className="hero-copy">
        <span className="eyebrow">Marketing and Donation Hub</span>
        <h1>{renderHeroTitle(heroTitle)}</h1>
        <p>{heroSummary}</p>
        <div className="cta-row">
          <a className="button primary" href={donateCta.href} target="_blank" rel="noreferrer">
            <span className="button-icon" aria-hidden="true"><FiArrowRight /></span>
            {donateCta.label}
          </a>
          <a className="button secondary" href={lookupCta.href} target="_blank" rel="noreferrer">
            <span className="button-icon" aria-hidden="true"><FiSearch /></span>
            {lookupCta.label}
          </a>
        </div>
      </div>
      <div className="hero-card">
        <p className="hero-card-label">Active campaign</p>
        <h2>{currentCampaign.title}</h2>
        {campaignSummary ? <p>{campaignSummary}</p> : null}
      </div>
    </section>
  );
}
