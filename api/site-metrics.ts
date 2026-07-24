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

function getInternalDonationEntryCount(rows: any[] = []) {
  return rows.length;
}

function toCampaignMilestoneMetrics(rows: any[], summary: any, internalRows: any[] = [], fallbackCampaign: any = null) {
  const milestoneSummaryMap = new Map<string, DonationSummaryMilestoneResponse>(
    (summary?.milestones ?? []).map((item: any) => [item.milestoneId, item])
  );
  const internalMilestoneMap = createInternalMilestoneMap(internalRows);

  const campaignPublicRaised = Math.max(getSummaryPublicRaised(summary), Number(fallbackCampaign?.public_amount ?? 0));
  const campaignPublicDonors = Math.max(getSummaryPublicDonors(summary), Number(fallbackCampaign?.donor_count ?? 0));

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
      raisedAmount,
      donorCount,
      percent
    };
  });
}

function toProgress(campaign: any, summary: any, campaignMilestones: any[] = [], internalDonorCount = 0) {
  const summaryPublicRaised = getSummaryPublicRaised(summary);
  const summaryPublicDonors = getSummaryPublicDonors(summary);
  const isSummaryOk = Boolean(summary && (summary as { ok?: boolean }).ok !== false);
  const publicRaised = (isSummaryOk && summaryPublicRaised > 0) ? summaryPublicRaised : Number(campaign?.public_amount ?? 0);
  const donorCount = (isSummaryOk && summaryPublicDonors > 0) ? summaryPublicDonors : Number(campaign?.donor_count ?? 0);
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
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(200).json({
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
        campaignMilestones: [],
        milestone: {
          title: "",
          nextAmount: 0,
          isVisible: false
        },
        homepageCampaigns: []
      });
    }

    const campaignsRes = await supabase
      .from("campaigns")
      .select("*")
      .eq("is_past", false)
      .eq("status", "Active")
      .order("homepage_order", { ascending: true })
      .order("last_updated", { ascending: false })
      .limit(6);

    const featuredCampaigns = campaignsRes.data ?? [];
    const allMetrics = await Promise.all(featuredCampaigns.map(async (campaign: any) => {
      const [milestoneRes, internalRows] = await Promise.all([
        supabase.from("campaign_milestones").select("*").eq("campaign_id", campaign.id).order("display_order", { ascending: true }),
        fetchInternalAdjustmentRows(campaign.id)
      ]);
      const campaignMilestones = milestoneRes.data ?? [];
      const cachedSummary = await getCachedDonationSummary(campaign.id);
      const summary = cachedSummary ?? await getDonationSummaryWithMilestones(
          campaignMilestones.map((item: any) => ({
            milestoneId: item.id,
            title: item.title,
            rowStart: Number(item.row_start ?? 0),
            rowEnd: Number(item.row_end ?? 0)
          })),
          String(campaign.sheet_name ?? "")
        ).catch(() => null);
      const internalEntryCount = getInternalDonationEntryCount(internalRows);

      return {
        campaign,
        campaignMilestones,
        internalRows,
        progress: toProgress(campaign, summary, campaignMilestones, internalEntryCount),
        summary
      };
    }));

    const primary = allMetrics[0];

    return res.status(200).json({
      progress: primary?.progress ?? {
        totalRaised: 0,
        publicRaised: 0,
        donorCount: 0,
        internalDonorCount: 0,
        goal: 0,
        internalRaised: 0,
        percent: 0,
        lastUpdated: ""
      },
      campaignMilestones: primary
        ? toCampaignMilestoneMetrics(primary.campaignMilestones, primary.summary, primary.internalRows, primary.campaign)
        : [],
      milestone: primary && primary.progress.totalRaised > 0
        ? {
            title: `${formatCurrency(primary.progress.totalRaised)} already raised for this campaign.`,
            nextAmount: 0,
            isVisible: true
          }
        : {
            title: "",
            nextAmount: 0,
            isVisible: false
          },
      homepageCampaigns: allMetrics.map((item) => ({
        id: item.campaign.id,
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
        campaignMilestones: toCampaignMilestoneMetrics(item.campaignMilestones, item.summary, item.internalRows, item.campaign)
      }))
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : "Unable to load site metrics."
    });
  }
}
