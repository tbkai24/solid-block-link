import { useEffect, useState } from "react";
import { siteContent as fallbackContent } from "../data/mockContent";
import { getSiteContent } from "../services/siteContent";
import { SiteContent } from "../types/content";

const CACHE_KEY = "sbl-site-content-cache";

type UseSiteContentState = {
  content: SiteContent;
  loading: boolean;
  error: string;
};

function readCachedContent(): SiteContent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SiteContent;
  } catch {
    return null;
  }
}

function writeCachedContent(content: SiteContent) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(content));
  } catch {
    // Ignore storage failures and keep the live app working.
  }
}

export function useSiteContent(): UseSiteContentState {
  const cachedContent = readCachedContent();
  const [content, setContent] = useState<SiteContent>(cachedContent ?? fallbackContent);
  const [loading, setLoading] = useState(!cachedContent);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const nextContent = await getSiteContent();
        if (!active) return;
        setContent(nextContent);
        writeCachedContent(nextContent);
        setError("");
      } catch (err) {
        if (!active) return;
        const message = err instanceof Error ? err.message : "Unable to load site content.";
        setError(message);
      } finally {
        if (active) setLoading(false);
      }
    }

    const refresh = () => {
      void load();
    };

    void load();
    const interval = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return { content, loading, error };
}
