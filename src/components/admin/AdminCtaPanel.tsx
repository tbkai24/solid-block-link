export function AdminCtaPanel() {
  const fields = [
    "Primary CTA label",
    "Primary CTA URL",
    "Secondary CTA label",
    "Secondary CTA URL",
    "CTA visibility toggle"
  ];

  return (
    <section className="admin-panel">
      <p className="eyebrow">CTA</p>
      <h2>CTA controls</h2>
      <ul className="admin-list">
        {fields.map((field) => (
          <li key={field}>{field}</li>
        ))}
      </ul>
    </section>
  );
}
