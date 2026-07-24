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

export function normalizeUsername(value: string) {
  return value.trim().replace(/^@+/, "").toLowerCase();
}

export function validateUsername(value: string) {
  const username = normalizeUsername(value);
  if (!username) return "Please add a username.";
  if (username.length < 3 || username.length > 24) return "Username must be 3 to 24 characters.";
  if (!/^[a-z0-9_]+$/.test(username)) return "Username can only use letters, numbers, and underscores.";
  return "";
}

export function validateSupportedEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (!email) return "Please add your email.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please add a valid email address.";

  const domain = email.split("@").pop() || "";
  if (!allowedEmailDomains.has(domain)) {
    return "Please use a supported email provider like Gmail, Yahoo, Outlook, iCloud, or Proton.";
  }

  return "";
}
