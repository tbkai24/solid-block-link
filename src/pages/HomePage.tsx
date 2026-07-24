import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HeroSection } from "../components/home/HeroSection";
import { HomepageCampaignsSection } from "../components/home/HomepageCampaignsSection";
import { OneStopHubSection } from "../components/home/OneStopHubSection";
import { PostsPreviewSection } from "../components/home/PostsPreviewSection";
import { useSiteContent } from "../hooks/useSiteContent";
import { HomepageCampaignItem } from "../types/content";

function hasCampaignDetails(campaign?: { id?: string; title?: string }) {
  return Boolean(campaign?.id && campaign.title?.trim());
}

export function HomePage() {
  const { content, loading, error, hasContent } = useSiteContent();
  const currentCampaignAsHomepageItem: HomepageCampaignItem | null = hasCampaignDetails(content.currentCampaign)
    ? {
        ...content.currentCampaign,
        progress: content.progress,
        milestone: content.milestone,
        campaignMilestones: content.campaignMilestones,
        milestoneCount: content.campaignMilestones.length
      }
    : null;
  const homepageCampaigns = content.homepageCampaigns.filter((campaign) => hasCampaignDetails(campaign));
  const activeHomepageCampaigns = homepageCampaigns.filter((campaign) => campaign.status === "Active");
  const fallbackActiveCampaign = currentCampaignAsHomepageItem?.status === "Active" ? currentCampaignAsHomepageItem : null;
  const availableCampaigns = activeHomepageCampaigns.length
    ? activeHomepageCampaigns
    : fallbackActiveCampaign
      ? [fallbackActiveCampaign]
      : [];
  const [activeCampaignId, setActiveCampaignId] = useState(availableCampaigns[0]?.id ?? "");

  useEffect(() => {
    if (!availableCampaigns.length) return;
    if (availableCampaigns.some((item) => item.id === activeCampaignId)) return;
    setActiveCampaignId(availableCampaigns[0].id);
  }, [activeCampaignId, availableCampaigns]);

  const activeCampaign = availableCampaigns.find((item) => item.id === activeCampaignId) ?? availableCampaigns[0];
  const activeDonateHref = activeCampaign?.donateUrl || content.donateCta.href;

  if (!hasContent && loading && !error) {
    return (
      <section className="page-panel site-loading-panel">
        <p className="eyebrow">Loading</p>
        <h1>Preparing the latest Solid Block Link site content</h1>
        <p className="page-lead">Please wait a moment while we pull the live campaign data.</p>
      </section>
    );
  }

  return (
    <>
      {error && <section className="page-panel"><p>{error}</p></section>}
      <HeroSection content={content} campaign={activeCampaign} donateHref={activeDonateHref} />
      {activeCampaign ? (
        <>
          <HomepageCampaignsSection
            campaigns={availableCampaigns}
            activeCampaignId={activeCampaign.id}
            onSelectCampaign={setActiveCampaignId}
          />
        </>
      ) : (
        <section className="content-section no-active-campaign-panel">
          <p className="eyebrow">Campaign Status</p>
          <h2>No active campaign right now</h2>
          <p className="page-lead">
            The latest drive has wrapped or no campaign has been marked active yet. You can still review past and pending campaign records in the campaign archive.
          </p>
          <div className="cta-row">
            <Link className="button primary" to="/campaigns">View Campaign Archive</Link>
            <Link className="button secondary" to="/updates">See Latest Updates</Link>
          </div>
        </section>
      )}
      <OneStopHubSection content={content} activeCampaign={activeCampaign} activeDonateHref={activeDonateHref} />
      <PostsPreviewSection updates={content.updates} embeds={content.embeds} />
      {loading && <section className="page-panel"><p>Refreshing content...</p></section>}
    </>
  );
}
