import { HomepageCampaignItem } from "../../types/content";
import { SectionHeading } from "../shared/SectionHeading";

type HomepageCampaignsSectionProps = {
  campaigns: HomepageCampaignItem[];
  activeCampaignId: string;
  onSelectCampaign: (campaignId: string) => void;
};

export function HomepageCampaignsSection({
  campaigns,
  activeCampaignId,
  onSelectCampaign
}: HomepageCampaignsSectionProps) {
  const visibleCampaigns = (campaigns ?? []).slice(0, 4);

  if (visibleCampaigns.length <= 1) return null;

  return (
    <section className="content-section">
      <SectionHeading
        eyebrow="Campaign Switcher"
        title="Choose a campaign view"
        copy="Switch in place to review each campaign's own progress, totals, and milestones without stretching the homepage."
      />
      <div className="homepage-campaign-tabs" role="tablist" aria-label="Homepage campaign tabs">
        {visibleCampaigns.map((campaign) => {
          const isActive = campaign.id === activeCampaignId;

          return (
            <button
              key={campaign.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`homepage-campaign-tab${isActive ? " active" : ""}`}
              onClick={() => onSelectCampaign(campaign.id)}
            >
              <span>{campaign.title}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
