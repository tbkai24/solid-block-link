import { faqItems } from "../data/faqs";

export function AboutPage() {
  const aboutCards = [
    {
      title: "Our Mission",
      body:
        "To turn fan support into coordinated action that strengthens SB19's global visibility, sustains campaign momentum, and helps every supporter find a clear way to contribute."
    },
    {
      title: "Our Vision",
      body:
        "To become a trusted global bridge for A'TIN collaboration: organized, transparent, data-aware, and ready to mobilize when SB19's music, tours, and milestones need collective support."
    },
    {
      title: "Our Values",
      body:
        "We move with accountability, creativity, teamwork, respect for local communities, and a shared belief that fan passion becomes stronger when it is structured with care."
    }
  ];

  const campaignHighlights = [
    "Coordinated visibility campaigns",
    "Fan project and event support",
    "Streaming and voting mobilization",
    "Transparent fundraising drives",
    "Regional collaboration",
    "Post-campaign reporting"
  ];

  return (
    <section className="page-shell">
      <div className="page-panel page-hero-panel about-hero-panel">
        <p className="eyebrow">About</p>
        <div className="about-hero-grid">
          <div className="about-hero-copy">
            <h1>About Solid Block Link</h1>
            <p className="about-lead-title">Where passion becomes organized support.</p>
            <p className="page-lead">
              Solid Block Link exists to give A&apos;TIN a focused home for campaign action: a place where ideas, skills, resources, and regional energy can move together with purpose.
            </p>
          </div>
          <div className="about-hero-note">
            <span className="chip">Fan-powered</span>
            <strong>Built on trust, clarity, and the collective drive to lift SB19 higher.</strong>
          </div>
        </div>
      </div>

      <div className="about-grid">
        {aboutCards.map((section) => (
          <article key={section.title} className="page-panel about-card">
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </article>
        ))}
      </div>

      <section className="page-panel about-card about-campaign-card">
        <p className="eyebrow">How We Move</p>
        <h2>Support, but with structure.</h2>
        <p>
          SBL is not only about reacting to a release or event. The goal is to plan, coordinate, execute, and report back so every push feels intentional and every supporter understands where their effort goes.
        </p>
        <div className="about-highlight-list">
          {campaignHighlights.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>

      <section className="faq-band about-faq-band" id="faq">
        <h2>FAQ</h2>
        <div className="faq-list">
          {faqItems.map((item) => (
            <details key={item.question}>
              <summary>{item.question}<span>+</span></summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </section>
  );
}
