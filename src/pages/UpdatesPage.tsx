import { useState } from "react";
import { SocialEmbedCard } from "../components/shared/SocialEmbedCard";
import { useSiteContent } from "../hooks/useSiteContent";

export function UpdatesPage() {
  const { content } = useSiteContent();
  const latestUpdates = content.updates;
  const [activeTab, setActiveTab] = useState<"latest" | "past">("latest");

  return (
    <section className="page-shell">
      <div className="page-panel page-hero-panel">
        <p className="eyebrow">Updates</p>
        <h1>Campaign news and selected posts</h1>
        <p className="page-lead">
          Follow featured campaign posts first, then browse the latest updates and the broader record of Solid Block Link activity.
        </p>
      </div>

      <div className="content-section">
        <div className="subtab-row" role="tablist" aria-label="Updates tabs">
          <button
            className={activeTab === "latest" ? "subtab-button active" : "subtab-button"}
            type="button"
            role="tab"
            aria-selected={activeTab === "latest"}
            onClick={() => setActiveTab("latest")}
          >
            Latest Updates
          </button>
          <button
            className={activeTab === "past" ? "subtab-button active" : "subtab-button"}
            type="button"
            role="tab"
            aria-selected={activeTab === "past"}
            onClick={() => setActiveTab("past")}
          >
            Past Campaigns
          </button>
        </div>

        {activeTab === "latest" ? (
          <div className="subtab-panel" role="tabpanel">
            <h2>Latest Updates</h2>
            <p className="muted-text">Recent campaign activity, announcements, and featured posts are collected here in one running feed.</p>
            <div className="card-grid updates-grid">
              {latestUpdates.map((item) => (
                <article className="feature-card update-list-card" key={item.id}>
                  <div>
                    <div className="post-preview-meta">
                      <span className="chip">{item.platform}</span>
                      <span className="label">{item.date}</span>
                    </div>
                    <h2>{item.title}</h2>
                    <p>{item.summary}</p>
                  </div>
                  <a className="text-link" href={item.href} target="_blank" rel="noreferrer">View post</a>
                </article>
              ))}
              {!latestUpdates.length ? <p className="muted-text">No latest updates yet.</p> : null}
            </div>
          </div>
        ) : (
          <div className="subtab-panel" role="tabpanel">
            <h2>Past Campaigns</h2>
            <p className="muted-text">Completed campaigns stay here as part of the broader update history and public track record.</p>
            <div className="card-grid updates-grid">
              {content.pastCampaigns.map((item) => (
                <article className="feature-card update-list-card" key={item.id}>
                  <div>
                    <p className="chip">{item.status}</p>
                    <h2>{item.title}</h2>
                    <p>{item.summary}</p>
                  </div>
                  <strong>{item.outcome}</strong>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
