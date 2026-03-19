import { EmbedItem, UpdateItem } from "../../types/content";
import { SocialEmbedCard } from "../shared/SocialEmbedCard";
import { SectionHeading } from "../shared/SectionHeading";

type PostsPreviewSectionProps = {
  updates: UpdateItem[];
  embeds: EmbedItem[];
};

export function PostsPreviewSection({ updates, embeds }: PostsPreviewSectionProps) {
  const featuredUpdates = updates.filter((item) => item.featured);
  const hasFeaturedUpdates = featuredUpdates.length > 0;

  return (
    <section className="content-section">
      <SectionHeading
        eyebrow="Featured Posts"
        title="Campaign highlights"
        copy="Featured posts are presented like a curated news feed so supporters can immediately spot the strongest updates."
      />
      <div className="card-grid post-preview-grid">
        {hasFeaturedUpdates
          ? featuredUpdates.map((item) => <SocialEmbedCard item={item} key={item.id} />)
          : embeds.map((item) => (
              <article className="embed-card post-preview-card" key={item.id}>
                <div className="post-preview-meta">
                  <span className="chip">{item.platform}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.embedNote}</p>
              </article>
            ))}
      </div>
    </section>
  );
}
