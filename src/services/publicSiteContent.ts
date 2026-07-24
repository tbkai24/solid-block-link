import { SiteContent, SiteMetricsPayload } from "../types/content";
import { getSiteContent } from "./siteContent";

const CACHED_API_TIMEOUT_MS = 5000;
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

function hasDynamicSiteData(content: SiteContent) {
  return Boolean(
    content.currentCampaign?.id ||
    content.currentCampaign?.title ||
    content.homepageCampaigns?.length ||
    content.progress?.totalRaised ||
    content.campaignMilestones?.length ||
    content.updates?.length ||
    content.embeds?.length ||
    content.pastCampaigns?.length
  );
}

function hasDynamicMetrics(metrics: SiteMetricsPayload) {
  return Boolean(
    metrics.progress?.totalRaised ||
    metrics.progress?.publicRaised ||
    metrics.progress?.donorCount ||
    metrics.campaignMilestones?.some((item) => item.raisedAmount || item.donorCount) ||
    metrics.homepageCampaigns?.some((item) =>
      item.progress?.totalRaised ||
      item.progress?.publicRaised ||
      item.progress?.donorCount ||
      item.campaignMilestones?.some((milestoneItem) => milestoneItem.raisedAmount || milestoneItem.donorCount)
    )
  );
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

    const payload = (await response.json()) as SiteContent;
    if (!hasDynamicSiteData(payload)) {
      throw new Error("Cached site content returned no live data.");
    }

    return payload;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Cached site content request timed out.");
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function fetchCachedSiteShell(): Promise<SiteContent> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), CACHED_API_TIMEOUT_MS);

  try {
    const response = await fetch("/api/site-shell", {
      headers: {
        Accept: "application/json"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error("Cached site shell request failed.");
    }

    const payload = (await response.json()) as SiteContent;
    if (!hasDynamicSiteData(payload)) {
      throw new Error("Cached site shell returned no live data.");
    }

    return payload;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Cached site shell request timed out.");
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function fetchCachedSiteMetrics(): Promise<SiteMetricsPayload> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), CACHED_API_TIMEOUT_MS);

  try {
    const response = await fetch("/api/site-metrics", {
      headers: {
        Accept: "application/json"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error("Cached site metrics request failed.");
    }

    const payload = (await response.json()) as SiteMetricsPayload;
    if (!hasDynamicMetrics(payload)) {
      throw new Error("Cached site metrics returned no live data.");
    }

    return payload;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Cached site metrics request timed out.");
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

export async function getPublicSiteShell(): Promise<SiteContent> {
  if (typeof window === "undefined" || isLocalHost()) {
    return withTimeout(
      getSiteContent(),
      FALLBACK_TIMEOUT_MS,
      "Direct site shell request timed out."
    );
  }

  try {
    return await fetchCachedSiteShell();
  } catch {
    return withTimeout(
      getSiteContent(),
      FALLBACK_TIMEOUT_MS,
      "Direct site shell request timed out."
    );
  }
}

export async function getPublicSiteMetrics(): Promise<SiteMetricsPayload> {
  if (typeof window === "undefined" || isLocalHost()) {
    const content = await withTimeout(
      getSiteContent(),
      FALLBACK_TIMEOUT_MS,
      "Direct site metrics request timed out."
    );

    return {
      progress: content.progress,
      campaignMilestones: content.campaignMilestones.map((item) => ({
        id: item.id,
        raisedAmount: item.raisedAmount,
        donorCount: item.donorCount,
        percent: item.percent
      })),
      milestone: content.milestone,
      homepageCampaigns: content.homepageCampaigns.map((item) => ({
        id: item.id,
        progress: item.progress,
        milestone: item.milestone,
        campaignMilestones: item.campaignMilestones.map((milestoneItem) => ({
          id: milestoneItem.id,
          raisedAmount: milestoneItem.raisedAmount,
          donorCount: milestoneItem.donorCount,
          percent: milestoneItem.percent
        }))
      }))
    };
  }

  try {
    return await fetchCachedSiteMetrics();
  } catch {
    const content = await withTimeout(
      getSiteContent(),
      FALLBACK_TIMEOUT_MS,
      "Direct site metrics request timed out."
    );

    return {
      progress: content.progress,
      campaignMilestones: content.campaignMilestones.map((item) => ({
        id: item.id,
        raisedAmount: item.raisedAmount,
        donorCount: item.donorCount,
        percent: item.percent
      })),
      milestone: content.milestone,
      homepageCampaigns: content.homepageCampaigns.map((item) => ({
        id: item.id,
        progress: item.progress,
        milestone: item.milestone,
        campaignMilestones: item.campaignMilestones.map((milestoneItem) => ({
          id: milestoneItem.id,
          raisedAmount: milestoneItem.raisedAmount,
          donorCount: milestoneItem.donorCount,
          percent: milestoneItem.percent
        }))
      }))
    };
  }
}
