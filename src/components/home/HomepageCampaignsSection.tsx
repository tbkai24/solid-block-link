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
        eyebrow="Active Campaigns"
        title="Switch between running campaigns"
        copy="When multiple campaigns are active at the same time, switch here to review each campaign's own progress, totals, and milestones."
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
