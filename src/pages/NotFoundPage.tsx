import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="page-shell">
      <div className="page-panel page-hero-panel not-found-panel">
        <p className="eyebrow">404</p>
        <h1>Page not found</h1>
        <p className="page-lead">
          The page you entered does not exist or may have been moved. You can head back to the homepage or continue browsing the current campaign.
        </p>
        <div className="cta-row">
          <Link className="button primary" to="/">
            Back to Home
          </Link>
          <Link className="button secondary" to="/campaigns">
            View Campaigns
          </Link>
        </div>
      </div>
    </section>
  );
}
