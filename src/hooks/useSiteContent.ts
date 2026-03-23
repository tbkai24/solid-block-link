import { useEffect, useState } from "react";
import { getPublicSiteContent } from "../services/publicSiteContent";
import { getSiteContentRefreshEvent, getSiteContentRefreshKey } from "../services/siteContentCache";
import { SiteContent } from "../types/content";

const CACHE_TTL_MS = 30 * 1000;
const SITE_CONTENT_REFRESH_EVENT = getSiteContentRefreshEvent();
const SITE_CONTENT_REFRESH_KEY = getSiteContentRefreshKey();

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
  lookupCta: { label: "SBL Donation Lookup", href: "#" },
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
  campaignMilestones: [],
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
    internalDonorCount: 0,
    goal: 0,
    internalRaised: 0,
    percent: 0,
    lastUpdated: ""
  },
  updates: [],
  embeds: [],
  pastCampaigns: []
};

let sharedState: UseSiteContentState = {
  content: emptyContent,
  loading: true,
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
    void refreshSiteContent();
  };

  window.setInterval(refresh, CACHE_TTL_MS);
  window.addEventListener("focus", refresh);
  window.addEventListener(SITE_CONTENT_REFRESH_EVENT, refresh);
  window.addEventListener("storage", (event) => {
    if (event.key === SITE_CONTENT_REFRESH_KEY) {
      refresh();
    }
  });
}

export function useSiteContent(): UseSiteContentState {
  const [state, setState] = useState<UseSiteContentState>(sharedState);

  useEffect(() => {
    listeners.add(setState);
    startRefreshLoop();
    void refreshSiteContent();

    return () => {
      listeners.delete(setState);
    };
  }, []);

  return state;
}
