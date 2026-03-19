import { useSiteContent } from "../hooks/useSiteContent";

export function AboutPage() {
  const { content } = useSiteContent();

  return (
    <section className="page-panel">
      <h1>{content.about.title}</h1>
      <p>{content.about.intro}</p>
      <p>{content.about.story}</p>
      <p>{content.about.mission}</p>
    </section>
  );
}
