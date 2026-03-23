const SITE_CONTENT_REFRESH_KEY = "sbl-site-content-refresh-at";
const SITE_CONTENT_REFRESH_EVENT = "sbl:site-content-refresh";

export function getSiteContentRefreshKey() {
  return SITE_CONTENT_REFRESH_KEY;
}

export function getSiteContentRefreshEvent() {
  return SITE_CONTENT_REFRESH_EVENT;
}

export function invalidateSiteContentCache() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(SITE_CONTENT_REFRESH_KEY, String(Date.now()));
  } catch {
    // Ignore storage failures and still dispatch the refresh event.
  }

  window.dispatchEvent(new CustomEvent(SITE_CONTENT_REFRESH_EVENT));
}
