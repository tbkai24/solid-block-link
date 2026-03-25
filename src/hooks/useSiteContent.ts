import { useEffect, useState } from "react";
import { getPublicSiteMetrics, getPublicSiteShell } from "../services/publicSiteContent";
import { getSiteContentCacheKey, getSiteContentRefreshEvent, getSiteContentRefreshKey } from "../services/siteContentCache";
import { SiteContent } from "../types/content";

const CACHE_TTL_MS = 15 * 1000;
const SITE_CONTENT_CACHE_KEY = getSiteContentCacheKey();
const SITE_CONTENT_REFRESH_EVENT = getSiteContentRefreshEvent();
const SITE_CONTENT_REFRESH_KEY = getSiteContentRefreshKey();
const CACHE_VERSION = 1;

type UseSiteContentState = {
  content: SiteContent;
  loading: boolean;
  error: string;
  hasContent: boolean;
};

type SiteContentSnapshot = {
  version: number;
  savedAt: string;
  content: SiteContent;
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

function normalizeSiteContent(content?: Partial<SiteContent> | null): SiteContent {
  return {
    ...emptyContent,
    ...content,
    donateCta: content?.donateCta ?? emptyContent.donateCta,
    lookupCta: content?.lookupCta ?? emptyContent.lookupCta,
    about: {
      ...emptyContent.about,
      ...(content?.about ?? {})
    },
    footer: {
      ...emptyContent.footer,
      ...(content?.footer ?? {})
    },
    milestone: {
      ...emptyContent.milestone,
      ...(content?.milestone ?? {})
    },
    currentCampaign: {
      ...emptyContent.currentCampaign,
      ...(content?.currentCampaign ?? {})
    },
    progress: {
      ...emptyContent.progress,
      ...(content?.progress ?? {})
    },
    campaignMilestones: Array.isArray(content?.campaignMilestones) ? content.campaignMilestones : [],
    updates: Array.isArray(content?.updates) ? content.updates : [],
    embeds: Array.isArray(content?.embeds) ? content.embeds : [],
    pastCampaigns: Array.isArray(content?.pastCampaigns) ? content.pastCampaigns : []
  };
}

function hasRenderableSiteContent(content: SiteContent) {
  return Boolean(
    content.logoUrl ||
    content.heroTitle ||
    content.heroSummary ||
    content.currentCampaign.id ||
    content.currentCampaign.title ||
    content.about.title ||
    content.footer.title ||
    content.progress.totalRaised ||
    content.updates.length ||
    content.campaignMilestones.length ||
    content.pastCampaigns.length
  );
}

function applyMetrics(content: SiteContent, metrics: {
  progress: SiteContent["progress"];
  milestone: SiteContent["milestone"];
  campaignMilestones: Array<{ id: string; raisedAmount: number; donorCount: number; percent: number }>;
}) {
  const metricsById = new Map(metrics.campaignMilestones.map((item) => [item.id, item]));

  return {
    ...content,
    progress: {
      ...content.progress,
      ...metrics.progress
    },
    milestone: {
      ...content.milestone,
      ...metrics.milestone
    },
    campaignMilestones: content.campaignMilestones.map((item) => {
      const next = metricsById.get(item.id);
      if (!next) return item;

      return {
        ...item,
        raisedAmount: next.raisedAmount,
        donorCount: next.donorCount,
        percent: next.percent
      };
    })
  };
}

function readSiteContentSnapshot() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(SITE_CONTENT_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as SiteContentSnapshot;
    if (!parsed || parsed.version !== CACHE_VERSION || !parsed.content) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeSiteContentSnapshot(content: SiteContent) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(SITE_CONTENT_CACHE_KEY, JSON.stringify({
      version: CACHE_VERSION,
      savedAt: new Date().toISOString(),
      content
    } satisfies SiteContentSnapshot));
  } catch {
    // Ignore storage failures and keep the app responsive.
  }
}

const initialSnapshot = readSiteContentSnapshot();
const initialContent = normalizeSiteContent(initialSnapshot?.content);

let sharedState: UseSiteContentState = {
  content: initialContent,
  loading: !hasRenderableSiteContent(initialContent),
  error: "",
  hasContent: hasRenderableSiteContent(initialContent)
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
      const nextShell = normalizeSiteContent(await getPublicSiteShell());
      sharedState = {
        content: nextShell,
        loading: false,
        error: "",
        hasContent: hasRenderableSiteContent(nextShell)
      };
      writeSiteContentSnapshot(nextShell);
      emit();

      const metrics = await getPublicSiteMetrics();
      const mergedContent = applyMetrics(nextShell, metrics);
      sharedState = {
        content: mergedContent,
        loading: false,
        error: "",
        hasContent: hasRenderableSiteContent(mergedContent)
      };
      writeSiteContentSnapshot(mergedContent);
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
    if (!sharedState.hasContent) {
      sharedState = {
        ...sharedState,
        loading: true
      };
      emit();
    }
    void refreshSiteContent();

    return () => {
      listeners.delete(setState);
    };
  }, []);

  return state;
}
