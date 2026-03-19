import { SiteContent } from "../types/content";
import { getSiteContent } from "./siteContent";

function isLocalHost() {
  if (typeof window === "undefined") return false;

  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}

export async function getPublicSiteContent(): Promise<SiteContent> {
  if (typeof window === "undefined" || isLocalHost()) {
    return getSiteContent();
  }

  try {
    const response = await fetch("/api/site-content", {
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error("Cached site content request failed.");
    }

    return (await response.json()) as SiteContent;
  } catch {
    return getSiteContent();
  }
}
