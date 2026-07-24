export function AdminUpdatesPanel() {
  const fields = [
    "Featured update cards",
    "Homepage order",
    "Embedded post URLs",
    "Past campaign entries",
    "Featured yes/no toggle"
  ];

  return (
    <section className="admin-panel">
      <p className="eyebrow">Content</p>
      <h2>Content controls</h2>
      <ul className="admin-list">
        {fields.map((field) => (
          <li key={field}>{field}</li>
        ))}
      </ul>
    </section>
  );
}
