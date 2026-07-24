export function AdminCampaignPanel() {
  const fields = [
    "Campaign title",
    "Campaign summary",
    "Donation goal",
    "Internal donation amount",
    "Campaign status",
    "Donate URL",
    "Lookup URL"
  ];

  return (
    <section className="admin-panel">
      <p className="eyebrow">Campaign</p>
      <h2>Campaign controls</h2>
      <ul className="admin-list">
        {fields.map((field) => (
          <li key={field}>{field}</li>
        ))}
      </ul>
    </section>
  );
}
