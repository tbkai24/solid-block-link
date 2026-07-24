function getTurnstileSiteKey() {
  return (
    process.env.VITE_TURNSTILE_SITE_KEY ||
    process.env.TURNSTILE_SITE_KEY ||
    process.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY ||
    process.env.CLOUDFLARE_TURNSTILE_SITE_KEY ||
    ""
  ).trim();
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, message: "Method not allowed." });
  }

  return res.status(200).json({
    ok: true,
    siteKey: getTurnstileSiteKey()
  });
}
