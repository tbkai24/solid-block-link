const REAL_SUPABASE_URL = "https://cnvxdxltwpwmnrfqvpqq.supabase.co";
const REAL_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNudnhkeGx0d3B3bW5yZnF2cHFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NjY1MzMsImV4cCI6MjA4NzE0MjUzM30.hSCWNAZNzWQTVDPPeUy7QWhqyXeqIhYQZllxJTjzAMw";

export default async function handler(req: any, res: any) {
  const envUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const supabaseUrl = (
    envUrl && !envUrl.includes("your-project-ref") ? envUrl : REAL_SUPABASE_URL
  ).replace(/\/$/, "");

  let subPath = req.url || "";
  if (subPath.startsWith("/api/supabase-proxy")) {
    subPath = subPath.replace("/api/supabase-proxy", "");
  }
  if (!subPath.startsWith("/")) {
    subPath = "/" + subPath;
  }

  const targetUrl = `${supabaseUrl}${subPath}`;

  const headers: Record<string, string> = {};
  
  const reqKey = req.headers?.apikey;
  const envKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  let finalKey = REAL_SUPABASE_ANON_KEY;
  if (reqKey && !reqKey.includes("your-public-anon-key")) {
    finalKey = reqKey;
  } else if (envKey && !envKey.includes("your-public-anon-key")) {
    finalKey = envKey;
  }
  headers["apikey"] = finalKey;

  if (req.headers?.authorization) {
    headers["authorization"] = req.headers.authorization;
  }
  if (req.headers?.["content-type"]) {
    headers["content-type"] = req.headers["content-type"];
  }
  if (req.headers?.["x-client-info"]) {
    headers["x-client-info"] = req.headers["x-client-info"];
  }

  let body: any = undefined;
  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    if (typeof req.body === "string") {
      body = req.body;
    } else if (req.body && Object.keys(req.body).length > 0) {
      body = JSON.stringify(req.body);
    }
  }

  try {
    console.log("Proxying request to targetUrl:", targetUrl, "method:", req.method, "headers:", headers, "body:", body);
    const targetRes = await fetch(targetUrl, {
      method: req.method,
      headers,
      body
    });

    const contentType = targetRes.headers.get("content-type") || "application/json";
    const resText = await targetRes.text();

    res.statusCode = targetRes.status;
    res.setHeader("content-type", contentType);
    return res.end(resText);
  } catch (err: any) {
    console.error("Supabase Proxy Error:", err, err?.cause);
    res.statusCode = 500;
    return res.end(
      JSON.stringify({
        error: "Proxy connection to Supabase failed",
        details: err?.message || String(err),
        cause: err?.cause ? String(err.cause?.message || err.cause) : null
      })
    );
  }
}
