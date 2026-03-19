import { useSiteContent } from "../hooks/useSiteContent";

export function AboutPage() {
  const { content } = useSiteContent();
  const sections = [
    { title: content.about.introTitle, body: content.about.intro },
    { title: content.about.storyTitle, body: content.about.story },
    { title: content.about.missionTitle, body: content.about.mission }
  ].filter((section) => section.title || section.body);

  const leadSection = sections[0];
  const supportingSections = sections.slice(1);

  return (
    <section className="page-shell">
      <div className="page-panel page-hero-panel about-hero-panel">
        <p className="eyebrow">About</p>
        <div className="about-hero-grid">
          <div className="about-hero-copy">
            <h1>{content.about.title}</h1>
            {leadSection?.title ? <p className="about-lead-title">{leadSection.title}</p> : null}
            {leadSection?.body ? <p className="page-lead">{leadSection.body}</p> : null}
          </div>
          <div className="about-hero-note">
            <span className="chip">Fan-powered</span>
            <strong>Strategy, visibility, and collective action for SB19&apos;s global momentum.</strong>
          </div>
        </div>
      </div>

      {supportingSections.length ? (
        <div className="about-grid">
          {supportingSections.map((section) => (
            <article key={section.title || section.body} className="page-panel about-card">
              {section.title ? <h2>{section.title}</h2> : null}
              {section.body ? <p>{section.body}</p> : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
