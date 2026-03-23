import { CampaignPulseSection } from "../components/home/CampaignPulseSection";
import { CampaignMilestonesSection } from "../components/home/CampaignMilestonesSection";
import { CurrentCampaignSection } from "../components/home/CurrentCampaignSection";
import { HeroSection } from "../components/home/HeroSection";
import { PostsPreviewSection } from "../components/home/PostsPreviewSection";
import { ProgressSection } from "../components/home/ProgressSection";
import { useSiteContent } from "../hooks/useSiteContent";

export function HomePage() {
  const { content, loading, error, hasContent } = useSiteContent();

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
      <HeroSection content={content} />
      <CampaignPulseSection campaign={content.currentCampaign} milestones={content.campaignMilestones} progress={content.progress} updates={content.updates} />
      <ProgressSection progress={content.progress} donateCta={content.donateCta} campaignTitle={content.currentCampaign.title} milestone={content.milestone} />
      <CurrentCampaignSection campaign={content.currentCampaign} />
      <CampaignMilestonesSection milestones={content.campaignMilestones} compact />
      <PostsPreviewSection updates={content.updates} embeds={content.embeds} />
      {loading && <section className="page-panel"><p>Refreshing content...</p></section>}
    </>
  );
}
