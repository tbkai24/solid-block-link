import { defineConfig, loadEnv, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import lookupApiHandler from "./api/lookup.js";
import siteShellHandler from "./api/site-shell.js";
import siteContentHandler from "./api/site-content.js";
import siteMetricsHandler from "./api/site-metrics.js";
import updateProfileHandler from "./api/update-profile.js";
import turnstileConfigHandler from "./api/turnstile-config.js";
import verifyTurnstileHandler from "./api/verify-turnstile.js";
import trackRegistrationHandler from "./api/track-registration.js";
import refreshDonationCacheHandler from "./api/refresh-donation-cache.js";
import supabaseProxyHandler from "./api/supabase-proxy.js";

function readJsonBody(req: any) {
  return new Promise<any>((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk: Buffer) => {
      raw += chunk.toString();
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res: any, statusCode: number, payload: unknown) {
  if (!res.headersSent) {
    res.statusCode = statusCode;
    res.setHeader("content-type", "application/json");
  }
  res.end(JSON.stringify(payload));
}

function wrapApiHandler(handler: any) {
  return async (req: any, res: any) => {
    const fullUrl = new URL(req.url || "", "http://localhost");
    const query = Object.fromEntries(fullUrl.searchParams.entries());

    let parsedBody: any = null;
    if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
      parsedBody = await readJsonBody(req).catch(() => ({}));
    }

    const reqAdapter: any = {
      method: req.method,
      query,
      body: parsedBody,
      headers: req.headers,
      socket: req.socket,
      url: req.url
    };

    const resAdapter: any = {
      statusCode: 200,
      headers: {} as Record<string, string>,
      status(code: number) {
        res.statusCode = code;
        this.statusCode = code;
        return this;
      },
      json(payload: any) {
        sendJson(res, this.statusCode || 200, payload);
        return this;
      },
      setHeader(name: string, value: string) {
        res.setHeader(name, value);
        this.headers[name] = value;
        return this;
      },
      end(data?: any) {
        res.end(data);
        return this;
      }
    };

    try {
      await handler(reqAdapter, resAdapter);
    } catch (err: any) {
      console.error("API handler error:", err);
      if (!res.headersSent) {
        sendJson(res, 500, {
          ok: false,
          message: err?.message || "API service error."
        });
      }
    }
  };
}

function localApiPlugin(): Plugin {
  return {
    name: "local-api-plugin",
    configureServer(server) {
      server.middlewares.use("/api/site-shell", wrapApiHandler(siteShellHandler));
      server.middlewares.use("/api/site-content", wrapApiHandler(siteContentHandler));
      server.middlewares.use("/api/site-metrics", wrapApiHandler(siteMetricsHandler));
      server.middlewares.use("/api/update-profile", wrapApiHandler(updateProfileHandler));
      server.middlewares.use("/api/lookup", wrapApiHandler(lookupApiHandler));
      server.middlewares.use("/api/turnstile-config", wrapApiHandler(turnstileConfigHandler));
      server.middlewares.use("/api/verify-turnstile", wrapApiHandler(verifyTurnstileHandler));
      server.middlewares.use("/api/track-registration", wrapApiHandler(trackRegistrationHandler));
      server.middlewares.use("/api/refresh-donation-cache", wrapApiHandler(refreshDonationCacheHandler));
      server.middlewares.use("/api/supabase-proxy", wrapApiHandler(supabaseProxyHandler));
      server.middlewares.use("/api/health", (_req, res) => {
        sendJson(res, 200, { ok: true, message: "SBL Donation Lookup API is running." });
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const combinedEnv = { ...process.env, ...env };
  Object.assign(process.env, combinedEnv);

  const processEnvDefines: Record<string, string> = {};
  for (const key of Object.keys(combinedEnv)) {
    if (key.startsWith("VITE_")) {
      processEnvDefines[`import.meta.env.${key}`] = JSON.stringify(combinedEnv[key]);
    }
  }

  return {
    define: processEnvDefines,
    server: {
      host: "0.0.0.0",
      port: 3000,
      allowedHosts: true
    },
    plugins: [react(), localApiPlugin()]
  };
});
