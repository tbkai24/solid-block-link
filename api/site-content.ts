import { createClient } from "@supabase/supabase-js";
import type { DonationSummaryMilestoneResponse } from "../src/types/appsScript";
import { getCachedDonationSummary } from "./_lib/donationSnapshots.js";
import { getEnv } from "./_lib/env.js";

function getSupabase() {
  const supabaseUrl = getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL") || "";
  const supabaseServerKey =
    getEnv("SUPABASE_SERVICE_ROLE_KEY") ||
    getEnv("SUPABASE_ANON_KEY") ||
    getEnv("VITE_SUPABASE_ANON_KEY") ||
    "";
  if (!supabaseUrl || !supabaseServerKey) return null;
  return createClient(supabaseUrl, supabaseServerKey);
}

function getAppsScriptUrl() {
  return (getEnv("VITE_APPS_SCRIPT_URL") || getEnv("APPS_SCRIPT_URL") || "").trim();
}

const APPS_SCRIPT_TIMEOUT_MS = 4500;

const DEFAULT_FOOTER_TITLE = "Connect with Solid Block Link";
const DEFAULT_FOOTER_SUMMARY = "Fan-powered marketing and donation campaigns helping promote SB19 worldwide.";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0
  }).format(value);
}

function getCombinedMilestoneTarget(rows: any[]) {
  return (rows ?? []).reduce((sum: number, item: any) => sum + Number(item?.target_amount ?? 0), 0);
}

function getSummaryPublicRaised(summary: any) {
  const topLevelTotal = Number(summary?.totalDonations ?? 0);
  if (topLevelTotal > 0) return topLevelTotal;

  return (summary?.milestones ?? []).reduce((sum: number, item: any) => sum + Number(item?.totalDonations ?? 0), 0);
}

function getSummaryPublicDonors(summary: any) {
  const topLevelEntries = Number(summary?.donationEntries ?? 0);
  const topLevelDonors = Number(summary?.donorCount ?? 0);
  if (topLevelEntries > 0) return topLevelEntries;
  if (topLevelDonors > 0) return topLevelDonors;

  return (summary?.milestones ?? []).reduce(
    (sum: number, item: any) => sum + Number(item?.donationEntries ?? item?.donorCount ?? 0),
    0
  );
}

function createTargetMap(rows: any[] = []) {
  return (rows ?? []).reduce((acc: Record<string, number>, item: any) => {
    const campaignId = String(item?.campaign_id ?? "");
    if (!campaignId) return acc;
    acc[campaignId] = (acc[campaignId] ?? 0) + Number(item?.target_amount ?? 0);
    return acc;
  }, {});
}

function createCountMap(rows: any[] = []) {
  return (rows ?? []).reduce((acc: Record<string, number>, item: any) => {
    const campaignId = String(item?.campaign_id ?? "");
    if (!campaignId) return acc;
    acc[campaignId] = (acc[campaignId] ?? 0) + 1;
    return acc;
  }, {});
}

async function fetchInternalDonorCounts(campaignIds: string[]) {
  const counts: Record<string, number> = {};
  const supabase = getSupabase();
  if (!supabase || !campaignIds.length) return counts;

  const rpcRes = await supabase.rpc("get_internal_donor_counts", {
    campaign_ids: campaignIds
  });

  if (!rpcRes.error) {
    (rpcRes.data ?? []).forEach((item: any) => {
      const campaignId = String(item?.campaign_id ?? "");
      if (campaignId) counts[campaignId] = Number(item?.donor_count ?? 0);
    });

    return counts;
  }

  const fallbackRes = await supabase
    .from("campaign_internal_adjustments")
    .select("campaign_id")
    .in("campaign_id", campaignIds);

  return createCountMap(fallbackRes.data ?? []);
}

async function getDonationSummary() {
  return getDonationSummaryWithMilestones();
}

async function getDonationSummaryWithMilestones(
  milestones: Array<{ milestoneId: string; title: string; rowStart: number; rowEnd: number }> = [],
  sheetName = ""
) {
  const appsScriptUrl = getAppsScriptUrl();
  if (!appsScriptUrl) return null;

  const query = new URLSearchParams({ action: "summary" });

  if (milestones.length) {
    query.set("milestones", JSON.stringify(milestones));
  }

  if (sheetName.trim()) {
    query.set("sheetName", sheetName.trim());
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), APPS_SCRIPT_TIMEOUT_MS);
  const response = await fetch(`${appsScriptUrl}?${query.toString()}`, {
    signal: controller.signal
  }).finally(() => clearTimeout(timeoutId));
  const data = (await response.json()) as any;

  if (!response.ok || !data?.ok) {
    throw new Error(data?.message || "Apps Script summary fetch failed.");
  }

  return data;
}

function createEmptyContent() {
  return {
    logoUrl: "",
    heroTitle: "",
    heroSummary: "",
    donateCta: { label: "Donate Now", href: "#" },
    lookupCta: { label: "SBL Donation Lookup", href: "/lookup" },
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
      title: DEFAULT_FOOTER_TITLE,
      summary: DEFAULT_FOOTER_SUMMARY
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
    homepageCampaigns: [],
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
    pastCampaigns: [],
    fanProjects: []
  };
}

function createInternalMilestoneMap(rows: any[]) {
  return (rows ?? []).reduce((acc: Record<string, { amount: number; donorCount: number }>, item: any) => {
    if (!item?.milestone_id) return acc;

    const current = acc[item.milestone_id] ?? { amount: 0, donorCount: 0 };
    acc[item.milestone_id] = {
      amount: current.amount + Number(item.amount ?? 0),
      donorCount: current.donorCount + 1
    };
    return acc;
  }, {});
}

function getInternalDonationEntryCount(rows: any[] = []) {
  return (rows ?? []).length;
}

async function fetchInternalAdjustmentRows(campaignId: string) {
  const supabase = getSupabase();
  if (!supabase) return [];

  const primary = await supabase
    .from("campaign_internal_adjustments")
    .select("id, campaign_id, milestone_id, name, amount, notes, added_at")
    .eq("campaign_id", campaignId);

  if (!primary.error) {
    return primary.data ?? [];
  }

  const fallback = await supabase
    .from("campaign_internal_adjustments")
    .select("id, campaign_id, label, amount, notes, added_at")
    .eq("campaign_id", campaignId);

  if (fallback.error) throw fallback.error;

  return (fallback.data ?? []).map((item: any) => ({
    id: String(item.id),
    campaign_id: String(item.campaign_id),
    milestone_id: null,
    name: String(item.label ?? ""),
    amount: Number(item.amount ?? 0),
    notes: String(item.notes ?? ""),
    added_at: String(item.added_at ?? "")
  }));
}

async function fetchInternalAdjustmentRowsForCampaigns(campaignIds: string[]) {
  const supabase = getSupabase();
  if (!supabase || !campaignIds.length) return [];

  const primary = await supabase
    .from("campaign_internal_adjustments")
    .select("id, campaign_id, milestone_id, name, amount, notes, added_at")
    .in("campaign_id", campaignIds);

  if (!primary.error) {
    return primary.data ?? [];
  }

  const fallback = await supabase
    .from("campaign_internal_adjustments")
    .select("id, campaign_id, label, amount, notes, added_at")
    .in("campaign_id", campaignIds);

  if (fallback.error) return [];

  return (fallback.data ?? []).map((item: any) => ({
    id: String(item.id),
    campaign_id: String(item.campaign_id),
    milestone_id: null,
    name: String(item.label ?? ""),
    amount: Number(item.amount ?? 0),
    notes: String(item.notes ?? ""),
    added_at: String(item.added_at ?? "")
  }));
}

function toCampaignMilestones(rows: any[], summary: any, internalRows: any[] = [], fallbackCampaign: any = null) {
  const milestoneSummaryMap = new Map<string, DonationSummaryMilestoneResponse>(
    (summary?.milestones ?? []).map((item: any) => [item.milestoneId, item])
  );
  const internalMilestoneMap = createInternalMilestoneMap(internalRows);

  const campaignPublicRaised = getSummaryPublicRaised(summary) || Number(fallbackCampaign?.public_amount ?? 0);
  const campaignPublicDonors = getSummaryPublicDonors(summary) || Number(fallbackCampaign?.donor_count ?? 0);

  const unassignedInternal = (internalRows ?? []).filter((item: any) => !item?.milestone_id);
  const unassignedInternalAmount = unassignedInternal.reduce((sum: number, item: any) => sum + Number(item?.amount ?? 0), 0);
  const unassignedInternalDonors = unassignedInternal.length;

  const totalMilestonesPublicRaised = (summary?.milestones ?? []).reduce(
    (sum: number, item: any) => sum + Number(item?.totalDonations ?? 0),
    0
  );
  const hasSpecificPublicBreakdown = milestoneSummaryMap.size > 0 && totalMilestonesPublicRaised > 0;

  const activeIndex = (rows ?? []).findIndex((r: any) => {
    const s = String(r?.status ?? "").toLowerCase();
    return s === "active" || s === "ongoing";
  });
  const primaryIndex = activeIndex >= 0 ? activeIndex : 0;

  return (rows ?? []).map((item: any, index: number) => {
    const milestoneSummary = milestoneSummaryMap.get(item.id);
    const internalMilestone = internalMilestoneMap[item.id];

    let publicRaised = Number(milestoneSummary?.totalDonations ?? 0);
    let publicDonors = Number(milestoneSummary?.donationEntries ?? milestoneSummary?.donorCount ?? 0);

    let internalRaised = Number(internalMilestone?.amount ?? 0);
    let internalDonors = Number(internalMilestone?.donorCount ?? 0);

    const isPrimaryMilestone = index === primaryIndex;

    if (rows.length === 1 || (!hasSpecificPublicBreakdown && isPrimaryMilestone)) {
      if (publicRaised === 0 && campaignPublicRaised > 0) {
        publicRaised = campaignPublicRaised;
      }
      if (publicDonors === 0 && campaignPublicDonors > 0) {
        publicDonors = campaignPublicDonors;
      }
    }

    if (unassignedInternalAmount > 0 && (rows.length === 1 || isPrimaryMilestone)) {
      internalRaised += unassignedInternalAmount;
      internalDonors += unassignedInternalDonors;
    }

    const raisedAmount = publicRaised + internalRaised;
    const donorCount = publicDonors + internalDonors;
    const targetAmount = Number(item.target_amount ?? 0);
    const percent = targetAmount > 0
      ? Math.min(Math.round(((raisedAmount / targetAmount) * 100) * 100) / 100, 100)
      : 0;

    return {
      id: item.id,
      title: item.title,
      targetAmount,
      rowStart: Number(item.row_start ?? 0),
      rowEnd: Number(item.row_end ?? 0),
      status: item.status ?? "Active",
      displayOrder: Number(item.display_order ?? 0),
      raisedAmount,
      donorCount,
      percent,
      note: item.note ?? ""
    };
  });
}

function toProgress(campaign: any, summary: any, campaignMilestones: any[] = [], internalDonorCount = 0) {
  const summaryPublicRaised = getSummaryPublicRaised(summary);
  const summaryPublicDonors = getSummaryPublicDonors(summary);
  const publicRaised = (summary && summary.ok && summaryPublicRaised > 0) ? summaryPublicRaised : Number(campaign?.public_amount ?? 0);
  const donorCount = (summary && summary.ok && summaryPublicDonors > 0) ? summaryPublicDonors : Number(campaign?.donor_count ?? 0);
  const internalRaised = campaign?.internal_amount ?? 0;
  const goal = getCombinedMilestoneTarget(campaignMilestones) || (campaign?.goal_amount ?? 0);
  const totalRaised = publicRaised + internalRaised;
  const percent = goal > 0
    ? Math.min(Math.round(((totalRaised / goal) * 100) * 100) / 100, 100)
    : 0;

  return {
    totalRaised,
    publicRaised,
    donorCount,
    internalDonorCount,
    goal,
    internalRaised,
    percent,
    lastUpdated: campaign?.last_updated ?? ""
  };
}

export default async function handler(_req: any, res: any) {
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300");
  res.setHeader("CDN-Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  res.setHeader("Vercel-CDN-Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");

  try {
    const base = createEmptyContent();
    const supabase = getSupabase();

    if (!supabase) {
      const summary = await getDonationSummary().catch(() => null);
      const publicRaised = getSummaryPublicRaised(summary);
      const donorCount = getSummaryPublicDonors(summary);

      return res.status(200).json({
        ...base,
        progress: {
          ...base.progress,
          totalRaised: publicRaised,
          publicRaised,
          donorCount,
          internalDonorCount: 0,
          lastUpdated: summary ? new Date().toISOString() : ""
        }
      });
    }

    const [campaignRes, updatesRes, embedsRes, pastRes, fanProjectsRes] = await Promise.all([
      supabase.from("campaigns").select("*").eq("is_past", false).eq("status", "Active").order("homepage_order", { ascending: true }).order("last_updated", { ascending: false }).limit(6),
      supabase.from("updates").select("*").order("published_at", { ascending: false }).limit(8),
      supabase.from("embeds").select("*").eq("featured", true).order("display_order", { ascending: true }).limit(4),
      supabase.from("campaigns").select("*").order("last_updated", { ascending: false }).limit(24),
      supabase.from("fan_projects").select("*").eq("featured", true).order("display_order", { ascending: true }).order("published_at", { ascending: false })
    ]);

    const featuredCampaigns = campaignRes.data ?? [];
    const campaign = featuredCampaigns[0] ?? null;
    const archiveCampaigns = pastRes.data ?? [];
    const archiveMilestoneRes = archiveCampaigns.length
      ? await supabase.from("campaign_milestones").select("*").in("campaign_id", archiveCampaigns.map((item: any) => item.id)).order("display_order", { ascending: true })
      : { data: [], error: null };
    const archiveInternalDonorsByCampaign = await fetchInternalDonorCounts(archiveCampaigns.map((item: any) => item.id));
    const archiveInternalRows = await fetchInternalAdjustmentRowsForCampaigns(archiveCampaigns.map((item: any) => item.id));
    const archiveTargetByCampaign = createTargetMap(archiveMilestoneRes.data ?? []);
    const archiveSummaryByCampaign = new Map<string, any>();
    await Promise.all(archiveCampaigns.map(async (archiveCampaign: any) => {
      archiveSummaryByCampaign.set(archiveCampaign.id, await getCachedDonationSummary(archiveCampaign.id));
    }));

    const featuredIds = featuredCampaigns.map((item: any) => item.id);
    const activeMilestoneRes = featuredIds.length
      ? await supabase.from("campaign_milestones").select("*").in("campaign_id", featuredIds).order("display_order", { ascending: true })
      : { data: [], error: null };
    const allActiveMilestones = activeMilestoneRes.data ?? [];

    const activeMetricsList = await Promise.all(featuredCampaigns.map(async (activeCampaignItem: any) => {
      const milestoneRows = allActiveMilestones.filter((item: any) => item.campaign_id === activeCampaignItem.id);
      const [internalRows, cachedSummary] = await Promise.all([
        fetchInternalAdjustmentRows(activeCampaignItem.id),
        getCachedDonationSummary(activeCampaignItem.id)
      ]);
      const milestoneSummary = cachedSummary ?? await getDonationSummaryWithMilestones(
        milestoneRows.map((item: any) => ({
          milestoneId: item.id,
          title: item.title,
          rowStart: Number(item.row_start ?? 0),
          rowEnd: Number(item.row_end ?? 0)
        })),
        String(activeCampaignItem?.sheet_name ?? "")
      ).catch(() => null);
      const internalEntryCount = getInternalDonationEntryCount(internalRows);
      const progress = toProgress(activeCampaignItem, milestoneSummary, milestoneRows, internalEntryCount);

      return {
        campaign: activeCampaignItem,
        milestoneRows,
        internalRows,
        milestoneSummary,
        internalEntryCount,
        progress
      };
    }));

    const primaryMetric = activeMetricsList[0] ?? null;
    const campaignMilestones = primaryMetric?.milestoneRows ?? [];
    const milestoneSummary = primaryMetric?.milestoneSummary ?? null;
    const internalRows = primaryMetric?.internalRows ?? [];
    const internalEntryCount = primaryMetric?.internalEntryCount ?? 0;
    const progress = primaryMetric?.progress ?? base.progress;

    const payload = {
      ...base,
      milestone: progress.totalRaised > 0
        ? {
            title: `${formatCurrency(progress.totalRaised)} already raised for this campaign.`,
            nextAmount: 0,
            isVisible: true
          }
        : {
            title: "",
            nextAmount: 0,
            isVisible: false
          },
      campaignMilestones: toCampaignMilestones(
        campaignMilestones,
        milestoneSummary,
        internalRows,
        campaign
      ),
      currentCampaign: {
        id: campaign?.id ?? "",
        title: campaign?.title ?? "",
        status: campaign?.status ?? "Active",
        summary: campaign?.summary ?? "",
        outcome: campaign?.outcome ?? "",
        donateUrl: campaign?.donate_url ?? "",
        sheetName: campaign?.sheet_name ?? "",
        homepageOrder: Number(campaign?.homepage_order ?? 0),
        goalAmount: Number(campaign?.goal_amount ?? 0),
        publicAmount: Number(campaign?.public_amount ?? 0),
        internalAmount: Number(campaign?.internal_amount ?? 0),
        donorCount: Number(campaign?.donor_count ?? 0),
        internalDonorCount: 0
      },
      homepageCampaigns: activeMetricsList.map((item) => ({
        id: item.campaign.id,
        title: item.campaign.title,
        status: item.campaign.status ?? "Active",
        summary: item.campaign.summary ?? "",
        outcome: item.campaign.outcome ?? "",
        donateUrl: item.campaign.donate_url ?? "",
        sheetName: item.campaign.sheet_name ?? "",
        homepageOrder: Number(item.campaign.homepage_order ?? 0),
        goalAmount: Number(item.campaign.goal_amount ?? 0),
        publicAmount: Number(item.campaign.public_amount ?? 0),
        internalAmount: Number(item.campaign.internal_amount ?? 0),
        donorCount: Number(item.campaign.donor_count ?? 0),
        internalDonorCount: 0,
        progress: item.progress,
        milestone: item.progress.totalRaised > 0
          ? {
              title: `${formatCurrency(item.progress.totalRaised)} already raised for this campaign.`,
              nextAmount: 0,
              isVisible: true
            }
          : {
              title: "",
              nextAmount: 0,
              isVisible: false
            },
        campaignMilestones: toCampaignMilestones(
          item.milestoneRows,
          item.milestoneSummary,
          item.internalRows,
          item.campaign
        ),
        milestoneCount: item.milestoneRows.length
      })),
      progress,
      updates: (Array.isArray(updatesRes.data) ? updatesRes.data : []).map((item: any) => ({
        id: item.id,
        title: item.title,
        summary: item.summary,
        label: item.content_label,
        category: item.update_category || item.content_label,
        platform: item.platform,
        date: new Date(item.published_at).toLocaleDateString(),
        href: item.href,
        featured: item.featured,
        popupEnabled: Boolean(item.show_as_popup),
        popupImageUrl: item.popup_image_url ?? "",
        popupFrequency: item.popup_frequency ?? "once",
        popupExpiresAt: item.popup_expires_at ?? ""
      })),
      embeds: (Array.isArray(embedsRes.data) ? embedsRes.data : []).map((item: any) => ({
        id: item.id,
        title: item.title,
        platform: item.platform,
        embedNote: item.embed_note
      })),
      pastCampaigns: archiveCampaigns.map((item: any) => {
        const liveSummary = archiveSummaryByCampaign.get(item.id) ?? null;
        const rows = (Array.isArray(archiveMilestoneRes.data) ? archiveMilestoneRes.data : []).filter((row: any) => row.campaign_id === item.id);
        const internalRows = archiveInternalRows.filter((row: any) => row.campaign_id === item.id);

        return {
          id: item.id,
          title: item.title,
          status: item.status,
          summary: item.summary,
          outcome: item.outcome,
          goalAmount: archiveTargetByCampaign[item.id] || Number(item.goal_amount ?? 0),
          publicAmount: liveSummary ? getSummaryPublicRaised(liveSummary) : Number(item.public_amount ?? 0),
          internalAmount: Number(item.internal_amount ?? 0),
          donorCount: liveSummary ? getSummaryPublicDonors(liveSummary) : Number(item.donor_count ?? 0),
          internalDonorCount: archiveInternalDonorsByCampaign[item.id] ?? 0,
          campaignMilestones: toCampaignMilestones(rows, liveSummary, internalRows),
          milestoneCount: rows.length
        };
      }),
      fanProjects: (Array.isArray(fanProjectsRes.data) ? fanProjectsRes.data : []).map((row: any) => ({
        title: row.title,
        category: row.category,
        region: row.region,
        addedBy: row.added_by || "Solid Block Link",
        description: row.description,
        eventDate: row.event_date ?? "",
        eventTime: row.event_time ?? "",
        eventTimezone: row.event_timezone ?? "",
        eventLocation: row.event_location ?? "",
        imageUrl: row.image_url || "/sbllogo.jpg",
        status: row.status,
        visibility: row.visibility,
        teaserText: row.teaser_text,
        noteText: row.note_text,
        relatedLink: row.related_link
      }))
    };

    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : "Unable to load cached site content."
    });
  }
}
