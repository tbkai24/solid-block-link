import { UpdateItem } from "../../types/content";
import { SectionHeading } from "../shared/SectionHeading";

type UpdatesSectionProps = {
  updates: UpdateItem[];
};

export function UpdatesSection({ updates }: UpdatesSectionProps) {
  const latestUpdates = updates.filter((item) => !item.featured).slice(0, 4);

  if (!latestUpdates.length) return null;

  return (
    <section className="content-section">
      <SectionHeading
        eyebrow="Latest Updates"
        title="Campaign updates that matter"
        copy="Keep this feed curated and brief so the homepage stays focused on action."
      />
      <div className="card-grid updates-grid">
        {latestUpdates.map((item) => (
          <article className="feature-card" key={item.id}>
            <div>
              <p className="chip">{item.label}</p>
              <p className="chip">{item.platform}</p>
              <p className="label">{item.date}</p>
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
            </div>
            <a className="text-link" href={item.href}>
              View details
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
