import { useSiteContent } from "../hooks/useSiteContent";

export function AboutPage() {
  const { content } = useSiteContent();
  const sections = [
    { title: content.about.introTitle, body: content.about.intro },
    { title: content.about.storyTitle, body: content.about.story },
    { title: content.about.missionTitle, body: content.about.mission }
  ].filter((section) => section.title || section.body);

  return (
    <section className="page-panel">
      <h1>{content.about.title}</h1>
      {sections.map((section) => (
        <div key={section.title || section.body} className="about-block">
          {section.title ? <h2>{section.title}</h2> : null}
          {section.body ? <p>{section.body}</p> : null}
        </div>
      ))}
    </section>
  );
}
