function getTurnstileSecretKey() {
  return (
    process.env.TURNSTILE_SECRET_KEY ||
    process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY ||
    ""
  ).trim();
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method not allowed." });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body;
  const secret = getTurnstileSecretKey();
  const token = String(body?.token || "").trim();
  const remoteIp = String(req.headers?.["x-forwarded-for"] || "").split(",")[0]?.trim();

  if (!secret) {
    return res.status(500).json({ ok: false, message: "Turnstile secret key is not configured." });
  }

  if (!token) {
    return res.status(400).json({ ok: false, message: "Missing Turnstile token." });
  }

  const formData = new URLSearchParams();
  formData.set("secret", secret);
  formData.set("response", token);
  if (remoteIp) formData.set("remoteip", remoteIp);

  const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: formData
  });

  const payload = (await verifyRes.json().catch(() => null)) as any;

  if (!verifyRes.ok || !payload?.success) {
    return res.status(400).json({
      ok: false,
      message: "Security check failed. Please refresh the challenge and try again.",
      codes: payload?.["error-codes"] ?? []
    });
  }

  return res.status(200).json({ ok: true });
}
