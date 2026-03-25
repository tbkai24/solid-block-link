import { SiteContent } from "../types/content";
import { getSiteContent } from "./siteContent";

const CACHED_API_TIMEOUT_MS = 8000;
const FALLBACK_TIMEOUT_MS = 10000;

function isLocalHost() {
  if (typeof window === "undefined") return false;

  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}

async function fetchCachedSiteContent(): Promise<SiteContent> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), CACHED_API_TIMEOUT_MS);

  try {
    const response = await fetch("/api/site-content", {
      headers: {
        Accept: "application/json"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error("Cached site content request failed.");
    }

    return (await response.json()) as SiteContent;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Cached site content request timed out.");
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function getPublicSiteContent(): Promise<SiteContent> {
  if (typeof window === "undefined" || isLocalHost()) {
    return withTimeout(
      getSiteContent(),
      FALLBACK_TIMEOUT_MS,
      "Direct site content request timed out."
    );
  }

  try {
    return await fetchCachedSiteContent();
  } catch {
    return withTimeout(
      getSiteContent(),
      FALLBACK_TIMEOUT_MS,
      "Direct site content request timed out."
    );
  }
}
