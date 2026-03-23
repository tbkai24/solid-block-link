import { CampaignPulseSection } from "../components/home/CampaignPulseSection";
import { CampaignMilestonesSection } from "../components/home/CampaignMilestonesSection";
import { CurrentCampaignSection } from "../components/home/CurrentCampaignSection";
import { HeroSection } from "../components/home/HeroSection";
import { PostsPreviewSection } from "../components/home/PostsPreviewSection";
import { ProgressSection } from "../components/home/ProgressSection";
import { UpdatesSection } from "../components/home/UpdatesSection";
import { useSiteContent } from "../hooks/useSiteContent";

export function HomePage() {
  const { content, loading, error } = useSiteContent();

  return (
    <>
      {error && <section className="page-panel"><p>{error}</p></section>}
      <HeroSection content={content} />
      <CampaignPulseSection campaign={content.currentCampaign} milestones={content.campaignMilestones} progress={content.progress} updates={content.updates} />
      <ProgressSection progress={content.progress} donateCta={content.donateCta} campaignTitle={content.currentCampaign.title} milestone={content.milestone} />
      <CurrentCampaignSection campaign={content.currentCampaign} />
      <CampaignMilestonesSection milestones={content.campaignMilestones} compact />
      <PostsPreviewSection updates={content.updates} embeds={content.embeds} />
      <UpdatesSection updates={content.updates} />
      {loading && <section className="page-panel"><p>Refreshing content...</p></section>}
    </>
  );
}
