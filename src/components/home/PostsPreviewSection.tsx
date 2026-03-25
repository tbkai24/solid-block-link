import { useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { EmbedItem, UpdateItem } from "../../types/content";
import { SocialEmbedCard } from "../shared/SocialEmbedCard";
import { SectionHeading } from "../shared/SectionHeading";

const FEATURED_PAGE_SIZE = 2;

type PostsPreviewSectionProps = {
  updates: UpdateItem[];
  embeds: EmbedItem[];
};

export function PostsPreviewSection({ updates, embeds }: PostsPreviewSectionProps) {
  const safeUpdates = Array.isArray(updates) ? updates : [];
  const safeEmbeds = Array.isArray(embeds) ? embeds : [];
  const featuredUpdates = safeUpdates.filter((item) => item.featured);
  const hasFeaturedUpdates = featuredUpdates.length > 0;
  const [activePage, setActivePage] = useState(0);
  const items = hasFeaturedUpdates ? featuredUpdates : safeEmbeds;
  const pageCount = Math.max(1, Math.ceil(items.length / FEATURED_PAGE_SIZE));
  const visibleFeatured = featuredUpdates.slice(activePage * FEATURED_PAGE_SIZE, activePage * FEATURED_PAGE_SIZE + FEATURED_PAGE_SIZE);
  const visibleEmbeds = safeEmbeds.slice(activePage * FEATURED_PAGE_SIZE, activePage * FEATURED_PAGE_SIZE + FEATURED_PAGE_SIZE);

  function move(direction: "prev" | "next") {
    if (pageCount <= 1) return;

    setActivePage((current) => {
      if (direction === "prev") {
        return current === 0 ? pageCount - 1 : current - 1;
      }

      return current === pageCount - 1 ? 0 : current + 1;
    });
  }

  return (
    <section className="content-section">
      <SectionHeading
        eyebrow="Featured Posts"
        title="Campaign highlights"
        copy="Featured posts are presented like a curated news feed so supporters can immediately spot the strongest updates."
      />
      <div className="updates-slider-head">
        <div>
        </div>
        {pageCount > 1 ? (
          <div className="updates-slider-controls">
            <button type="button" className="subtab-button" onClick={() => move("prev")} aria-label="Previous featured post">
              <FiChevronLeft />
            </button>
            <span className="label">{activePage + 1} / {pageCount}</span>
            <button type="button" className="subtab-button" onClick={() => move("next")} aria-label="Next featured post">
              <FiChevronRight />
            </button>
          </div>
        ) : null}
      </div>
      <div className="card-grid post-preview-grid">
        {hasFeaturedUpdates
          ? visibleFeatured.map((item) => <SocialEmbedCard item={item} key={item.id} />)
          : visibleEmbeds.map((item) => (
              <article className="embed-card post-preview-card" key={item.id}>
                <div className="post-preview-meta">
                  <span className="chip">{item.platform}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.embedNote}</p>
              </article>
            ))}
        {!items.length ? <p className="muted-text">No featured posts yet.</p> : null}
      </div>
    </section>
  );
}
