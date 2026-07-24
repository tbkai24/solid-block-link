import { useSiteContent } from "../hooks/useSiteContent";

export function PastCampaignsPage() {
  const { content, loading, error, hasContent } = useSiteContent();

  if (!hasContent && loading && !error) {
    return (
      <section className="page-panel site-loading-panel">
        <p className="eyebrow">Past Campaigns</p>
        <h1>Loading campaign archive</h1>
        <p className="page-lead">We&apos;re pulling the published campaign history now.</p>
      </section>
    );
  }

  return (
    <section className="page-panel">
      <h1>Past Campaigns</h1>
      <p>Completed campaigns build trust by showing history, outcomes, and consistency.</p>
      <div className="card-grid">
        {content.pastCampaigns.map((item) => (
          <article className="feature-card" key={item.id}>
            <div>
              <p className="chip">{item.status}</p>
              <h2>{item.title}</h2>
              <p>{item.summary}</p>
            </div>
            <strong>{item.outcome}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
