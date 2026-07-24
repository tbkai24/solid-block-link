import { useEffect } from "react";

const maintenanceMessage =
  import.meta.env.VITE_MAINTENANCE_MESSAGE ||
  "We are doing a quick tune-up and will be back shortly.";

const maintenanceEta = import.meta.env.VITE_MAINTENANCE_ETA;

export function MaintenancePage() {
  useEffect(() => {
    document.title = "Maintenance ongoing | Solid Block Link";
  }, []);

  return (
    <main className="maintenance-shell" aria-labelledby="maintenance-title">
      <section className="maintenance-panel">
        <span className="brand-kicker">Solid Block Link</span>
        <h1 id="maintenance-title">Maintenance ongoing</h1>
        <p>{maintenanceMessage}</p>
        {maintenanceEta ? (
          <p className="maintenance-eta">
            Expected back: <strong>{maintenanceEta}</strong>
          </p>
        ) : null}
      </section>
    </main>
  );
}
