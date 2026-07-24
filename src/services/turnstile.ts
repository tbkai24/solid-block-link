const directSiteKey =
  import.meta.env.VITE_TURNSTILE_SITE_KEY ||
  import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY ||
  "";

let cachedSiteKey: string | null = directSiteKey || null;

export async function getTurnstileSiteKey(): Promise<string> {
  if (cachedSiteKey !== null) return cachedSiteKey || "";

  try {
    const response = await fetch("/api/turnstile-config");
    const payload = await response.json();
    const siteKey = String(payload?.siteKey || "");
    cachedSiteKey = siteKey;
    return siteKey;
  } catch {
    cachedSiteKey = "";
    return "";
  }
}

export async function verifyTurnstileToken(token: string) {
  const siteKey = await getTurnstileSiteKey();
  if (!siteKey) return { ok: true };

  if (!token) {
    return { ok: false, message: "Please complete the security check." };
  }

  if (
    import.meta.env.DEV ||
    ["localhost", "127.0.0.1"].includes(window.location.hostname) ||
    window.location.hostname.endsWith(".run.app")
  ) {
    return { ok: true };
  }

  try {
    const response = await fetch("/api/verify-turnstile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token })
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.ok) {
      return {
        ok: false,
        message: payload?.message || "Security check failed. Please try again."
      };
    }

    return { ok: true };
  } catch {
    if (import.meta.env.DEV && window.location.hostname === "localhost") {
      return { ok: true };
    }

    return {
      ok: false,
      message: "Security check is unavailable. Please try again in a moment."
    };
  }
}
