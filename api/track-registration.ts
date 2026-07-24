import { getSupabase } from "./_lib/donationSnapshots.js";

function getClientIp(req: any) {
  const forwardedFor = String(req.headers?.["x-forwarded-for"] || "");
  const firstForwardedIp = forwardedFor.split(",")[0]?.trim();
  return firstForwardedIp || String(req.headers?.["x-real-ip"] || req.socket?.remoteAddress || "").trim();
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method not allowed." });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return res.status(500).json({ ok: false, message: "Supabase is not configured." });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body;
  const userId = String(body?.userId || "").trim();
  const email = String(body?.email || "").trim().toLowerCase();
  const signupIp = getClientIp(req);
  const signupUserAgent = String(req.headers?.["user-agent"] || "").slice(0, 500);

  if (!userId || !email) {
    return res.status(400).json({ ok: false, message: "Missing registration details." });
  }

  const { error } = await supabase
    .from("user_profiles")
    .update({
      signup_ip: signupIp || null,
      signup_user_agent: signupUserAgent,
      signup_tracked_at: new Date().toISOString()
    })
    .eq("id", userId)
    .eq("email", email)
    .is("signup_tracked_at", null);

  if (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }

  return res.status(200).json({ ok: true });
}
