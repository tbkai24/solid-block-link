import { useEffect, useState } from "react";
import { getPublicSiteContent } from "../services/publicSiteContent";
import { SiteContent } from "../types/content";

const CACHE_KEY = "sbl-site-content-cache";
const CACHE_VERSION = 1;
const CACHE_TTL_MS = 15 * 1000;

type CacheEnvelope = {
  version: number;
  savedAt: string;
  content: SiteContent;
};

type UseSiteContentState = {
  content: SiteContent;
  loading: boolean;
  error: string;
};

const emptyContent: SiteContent = {
  logoUrl: "",
  heroTitle: "",
  heroSummary: "",
  donateCta: { label: "Donate Now", href: "#" },
  lookupCta: { label: "SBL Lookup", href: "#" },
  about: {
    title: "",
    introTitle: "",
    intro: "",
    storyTitle: "",
    story: "",
    missionTitle: "",
    mission: ""
  },
  footer: {
    title: "",
    summary: ""
  },
  milestone: {
    title: "",
    nextAmount: 0,
    isVisible: false
  },
  currentCampaign: {
    id: "",
    title: "",
    status: "Active",
    summary: "",
    outcome: ""
  },
  progress: {
    totalRaised: 0,
    publicRaised: 0,
    donorCount: 0,
    goal: 0,
    internalRaised: 0,
    percent: 0,
    lastUpdated: ""
  },
  updates: [],
  embeds: [],
  pastCampaigns: []
};

function readCacheEnvelope(): CacheEnvelope | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CacheEnvelope;
    if (!parsed || parsed.version !== CACHE_VERSION || !parsed.content) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeCacheEnvelope(content: SiteContent) {
  if (typeof window === "undefined") return;

  const payload: CacheEnvelope = {
    version: CACHE_VERSION,
    savedAt: new Date().toISOString(),
    content
  };

  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures and keep the live app working.
  }
}

function isCacheStale(envelope: CacheEnvelope | null) {
  if (!envelope?.savedAt) return true;

  const savedAt = new Date(envelope.savedAt).getTime();
  if (Number.isNaN(savedAt)) return true;

  return Date.now() - savedAt > CACHE_TTL_MS;
}

const cachedEnvelope = readCacheEnvelope();

let sharedState: UseSiteContentState = {
  content: cachedEnvelope?.content ?? emptyContent,
  loading: !cachedEnvelope,
  error: ""
};

let inflightRequest: Promise<void> | null = null;
let refreshLoopStarted = false;
const listeners = new Set<(state: UseSiteContentState) => void>();

function emit() {
  listeners.forEach((listener) => listener(sharedState));
}

async function refreshSiteContent() {
  if (inflightRequest) return inflightRequest;

  inflightRequest = (async () => {
    try {
      const nextContent = await getPublicSiteContent();
      sharedState = {
        content: nextContent,
        loading: false,
        error: ""
      };
      writeCacheEnvelope(nextContent);
    } catch (error) {
      sharedState = {
        ...sharedState,
        loading: false,
        error: error instanceof Error ? error.message : "Unable to load site content."
      };
    } finally {
      inflightRequest = null;
      emit();
    }
  })();

  return inflightRequest;
}

function startRefreshLoop() {
  if (refreshLoopStarted || typeof window === "undefined") return;
  refreshLoopStarted = true;

  const refresh = () => {
    const nextEnvelope = readCacheEnvelope();

    if (isCacheStale(nextEnvelope)) {
      void refreshSiteContent();
    }
  };

  window.setInterval(refresh, CACHE_TTL_MS);
  window.addEventListener("focus", refresh);
}

export function useSiteContent(): UseSiteContentState {
  const [state, setState] = useState<UseSiteContentState>(sharedState);

  useEffect(() => {
    listeners.add(setState);
    startRefreshLoop();

    if (isCacheStale(readCacheEnvelope())) {
      void refreshSiteContent();
    } else {
      sharedState = {
        ...sharedState,
        loading: false
      };
      emit();
    }

    return () => {
      listeners.delete(setState);
    };
  }, []);

  return state;
}
