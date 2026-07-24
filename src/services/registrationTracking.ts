export async function trackRegistration(userId: string, email: string) {
  try {
    await fetch("/api/track-registration", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, email })
    });
  } catch {
    // Registration should not fail if telemetry cannot be saved.
  }
}
