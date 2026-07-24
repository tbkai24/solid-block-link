import { getSupabase } from "./_lib/donationSnapshots.js";

const allowedEmailDomains = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.com.ph",
  "ymail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com"
]);

function getBearerToken(req: any) {
  const header = String(req.headers?.authorization || "");
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
}

function normalizeUsername(value: string) {
  return value.trim().replace(/^@+/, "").toLowerCase();
}

function validateUsername(value: string) {
  const username = normalizeUsername(value);
  if (!username) return "Please add a username.";
  if (username.length < 3 || username.length > 24) return "Username must be 3 to 24 characters.";
  if (!/^[a-z0-9_]+$/.test(username)) return "Username can only use letters, numbers, and underscores.";
  return "";
}

function validateSupportedEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (!email) return "Please add your email.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please add a valid email address.";

  const domain = email.split("@").pop() || "";
  if (!allowedEmailDomains.has(domain)) {
    return "Please use a supported email provider like Gmail, Yahoo, Outlook, iCloud, or Proton.";
  }

  return "";
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method not allowed." });
  }

  const supabase = getSupabase();

  if (!supabase) {
    return res.status(500).json({ ok: false, message: "Supabase is not configured." });
  }

  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ ok: false, message: "Please sign in again before saving your profile." });
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) {
    return res.status(401).json({ ok: false, message: "Your session expired. Please sign in again." });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body;
  const displayName = String(body?.displayName || "").trim();
  const username = normalizeUsername(String(body?.username || ""));
  const email = String(body?.email || "").trim().toLowerCase();

  const usernameError = validateUsername(username);
  const emailError = validateSupportedEmail(email);
  if (!displayName || usernameError || emailError) {
    return res.status(400).json({ ok: false, message: usernameError || emailError || "Please add your name." });
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .update({
      display_name: displayName,
      username,
      email
    })
    .eq("id", authData.user.id)
    .select("*")
    .single();

  if (error) {
    const isDuplicateUsername = error.code === "23505" && String(error.message || "").toLowerCase().includes("username");
    return res.status(400).json({
      ok: false,
      message: isDuplicateUsername ? "Username is already taken." : error.message
    });
  }

  return res.status(200).json({ ok: true, profile: data });
}
