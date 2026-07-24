import { Link } from "react-router-dom";
import { FiBell } from "react-icons/fi";
import { useSiteContent } from "../hooks/useSiteContent";

export function AnnouncementsPage() {
  const { content, loading, error, hasContent } = useSiteContent();
  const announcements = content.updates.filter((item) => (item.category || item.label) === "Announcement");

  if (!hasContent && loading && !error) {
    return (
      <section className="page-panel site-loading-panel">
        <p className="eyebrow">Announcements</p>
        <h1>Loading announcements</h1>
        <p className="page-lead">Team-wide announcements are being fetched now.</p>
      </section>
    );
  }

  return (
    <section className="page-shell announcements-page">
      <div className="page-panel page-hero-panel">
        <p className="eyebrow">Announcements</p>
        <h1>Announcements from SBL teams.</h1>
        <p className="page-lead">
          Team notices, coordination updates, and important SB19 support announcements from Solid Block Link live here.
        </p>
      </div>

      <div className="card-grid updates-grid">
        {announcements.map((item) => (
          <article className="feature-card update-list-card announcement-card" key={item.id}>
            <div>
              <div className="post-preview-meta">
                <span className="chip"><FiBell aria-hidden="true" /> Announcement</span>
                <span className="label">{item.date}</span>
              </div>
              <h2>{item.title}</h2>
              <p>{item.summary}</p>
            </div>
            {item.href.startsWith("/") ? (
              <Link className="text-link" to={item.href}>View announcement</Link>
            ) : (
              <a className="text-link" href={item.href} target="_blank" rel="noreferrer">View announcement</a>
            )}
          </article>
        ))}
        {!announcements.length ? <p className="muted-text">No announcements have been posted yet.</p> : null}
      </div>
    </section>
  );
}
