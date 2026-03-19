import { CampaignItem } from "../../types/content";
import { SectionHeading } from "../shared/SectionHeading";

type PastCampaignsSectionProps = {
  campaigns: CampaignItem[];
};

export function PastCampaignsSection({ campaigns }: PastCampaignsSectionProps) {
  return (
    <section className="content-section">
      <SectionHeading
        eyebrow="Past Campaigns"
        title="Show proof of impact"
        copy="Past campaigns help the site feel credible and alive, even when there is only one active drive at a time."
      />
      <div className="card-grid">
        {campaigns.map((item) => (
          <article className="feature-card" key={item.id}>
            <div>
              <p className="chip">{item.status}</p>
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
            </div>
            <strong>{item.outcome}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
