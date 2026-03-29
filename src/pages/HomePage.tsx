import { useEffect, useState } from "react";
import { CampaignPulseSection } from "../components/home/CampaignPulseSection";
import { CampaignMilestonesSection } from "../components/home/CampaignMilestonesSection";
import { CurrentCampaignSection } from "../components/home/CurrentCampaignSection";
import { HeroSection } from "../components/home/HeroSection";
import { HomepageCampaignsSection } from "../components/home/HomepageCampaignsSection";
import { PostsPreviewSection } from "../components/home/PostsPreviewSection";
import { ProgressSection } from "../components/home/ProgressSection";
import { useSiteContent } from "../hooks/useSiteContent";

export function HomePage() {
  const { content, loading, error, hasContent } = useSiteContent();
  const availableCampaigns = content.homepageCampaigns.length
    ? content.homepageCampaigns
    : [{
        ...content.currentCampaign,
        progress: content.progress,
        milestone: content.milestone,
        campaignMilestones: content.campaignMilestones,
        milestoneCount: content.campaignMilestones.length
      }];
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
      <HomepageCampaignsSection
        campaigns={availableCampaigns}
        activeCampaignId={activeCampaign?.id ?? ""}
        onSelectCampaign={setActiveCampaignId}
      />
      <CampaignPulseSection campaign={activeCampaign} milestones={activeCampaign?.campaignMilestones ?? []} progress={activeCampaign?.progress ?? content.progress} updates={content.updates} />
      <ProgressSection
        progress={activeCampaign?.progress ?? content.progress}
        donateCta={content.donateCta}
        campaignTitle={activeCampaign?.title ?? content.currentCampaign.title}
        milestone={activeCampaign?.milestone ?? content.milestone}
        donateHref={activeDonateHref}
      />
      <CurrentCampaignSection campaign={activeCampaign ?? content.currentCampaign} />
      <CampaignMilestonesSection milestones={activeCampaign?.campaignMilestones ?? content.campaignMilestones} compact />
      <PostsPreviewSection updates={content.updates} embeds={content.embeds} />
      {loading && <section className="page-panel"><p>Refreshing content...</p></section>}
    </>
  );
}
