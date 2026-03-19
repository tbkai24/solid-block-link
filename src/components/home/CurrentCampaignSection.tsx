import { CampaignItem } from "../../types/content";
import { SectionHeading } from "../shared/SectionHeading";

type CurrentCampaignSectionProps = {
  campaign: CampaignItem;
};

export function CurrentCampaignSection({ campaign }: CurrentCampaignSectionProps) {
  return (
    <section className="content-section">
      <SectionHeading
        eyebrow="Current Campaign"
        title={campaign.title}
        copy="Keep the current push easy to understand: what it supports, why it matters, and what result the community is trying to reach."
      />
      <div className="campaign-status-row">
        <p className="chip">{campaign.status}</p>
      </div>
    </section>
  );
}
