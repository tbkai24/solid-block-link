import { createClient, SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://cnvxdxltwpwmnrfqvpqq.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNudnhkeGx0d3B3bW5yZnF2cHFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NjY1MzMsImV4cCI6MjA4NzE0MjUzM30.hSCWNAZNzWQTVDPPeUy7QWhqyXeqIhYQZllxJTjzAMw";

function getUrl() {
  return (
    import.meta.env.VITE_SUPABASE_URL ||
    (typeof window !== "undefined" && (window as any).__ENV?.VITE_SUPABASE_URL) ||
    DEFAULT_SUPABASE_URL
  );
}

function getKey() {
  return (
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    (typeof window !== "undefined" && (window as any).__ENV?.VITE_SUPABASE_ANON_KEY) ||
    DEFAULT_SUPABASE_ANON_KEY
  );
}

const customFetch: typeof fetch = async (input, init) => {
  const urlStr = typeof input === "string" ? input : (input as Request)?.url || "";
  try {
    return await fetch(input, init);
  } catch (err) {
    if (typeof window !== "undefined" && urlStr.includes(".supabase.co")) {
      try {
        const urlObj = new URL(urlStr);
        const proxyUrl = `/api/supabase-proxy${urlObj.pathname}${urlObj.search}`;
        const proxyRes = await fetch(proxyUrl, init);
        if (proxyRes.ok) {
          return proxyRes;
        }
      } catch {
        // preserve original fetch error
      }
    }
    throw err;
  }
};

export function getSupabase(): SupabaseClient | null {
  const url = getUrl();
  const key = getKey();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    },
    global: {
      fetch: customFetch
    }
  });
}

export const hasSupabaseEnv = Boolean(getUrl() && getKey());

export const supabase = getSupabase();

export function formatAuthError(error: any): string {
  if (!error) return "";
  if (typeof window !== "undefined" && error) {
    console.warn("[Auth Error]", error);
  }
  
  const rawMsg = typeof error === "string" ? error : error?.message || error?.error_description || "";
  if (!rawMsg) return "An error occurred during authentication. Please try again.";
  
  const lower = rawMsg.toLowerCase();
  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("typeerror") ||
    lower.includes("proxy connection") ||
    lower.includes("fetch failed")
  ) {
    return "Unable to connect to the authentication server. Please check your connection or try again.";
  }
  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid_credentials") ||
    lower.includes("invalid password") ||
    lower.includes("wrong password") ||
    lower.includes("invalid grant")
  ) {
    return "Invalid email or password. Please check your credentials and try again.";
  }
  if (lower.includes("user not found") || lower.includes("account not found") || lower.includes("user_not_found")) {
    return "Account not found. Please check your email or create a new account.";
  }
  if (lower.includes("already registered") || lower.includes("already exists") || lower.includes("user_already_exists")) {
    return "An account with this email address already exists. Please sign in instead.";
  }
  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return "Too many attempts. Please wait a moment before trying again.";
  }
  if (lower.includes("password should be at least") || lower.includes("password is too short")) {
    return "Password is too short. Please choose a password with at least 8 characters.";
  }
  if (lower.includes("email not confirmed") || lower.includes("unconfirmed_email")) {
    return "Account registration is pending confirmation. Please try logging in or contact support.";
  }
  if (lower.includes("email logins are disabled")) {
    return "Email login is currently disabled on the server.";
  }
  if (lower.includes("auth session missing") || lower.includes("session_not_found")) {
    return "Session invalid or expired. Please enter your email and password to log in.";
  }

  // Fallback for any unknown technical / server error to keep UI clean
  return "An unexpected authentication error occurred. Please try again.";
}
