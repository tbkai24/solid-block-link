import { useSiteContent } from "../hooks/useSiteContent";

export function PastCampaignsPage() {
  const { content } = useSiteContent();

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
