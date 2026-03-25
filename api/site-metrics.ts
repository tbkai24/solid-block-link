import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supabaseServerKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "";
const appsScriptUrl = (process.env.APPS_SCRIPT_URL || process.env.VITE_APPS_SCRIPT_URL || "").trim();

const supabase = supabaseUrl && supabaseServerKey
  ? createClient(supabaseUrl, supabaseServerKey)
  : null;

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

async function getDonationSummaryWithMilestones(milestones: Array<{ milestoneId: string; title: string; rowStart: number; rowEnd: number }> = []) {
  if (!appsScriptUrl) return null;

  const query = new URLSearchParams({ action: "summary" });

  if (milestones.length) {
    query.set("milestones", JSON.stringify(milestones));
  }

  const response = await fetch(`${appsScriptUrl}?${query.toString()}`);
  const data = await response.json();

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

function toCampaignMilestoneMetrics(rows: any[], summary: any, internalRows: any[] = []) {
  const milestoneSummaryMap = new Map(
    (summary?.milestones ?? []).map((item: any) => [item.milestoneId, item])
  );
  const internalMilestoneMap = createInternalMilestoneMap(internalRows);

  return (rows ?? []).map((item: any) => {
    const milestoneSummary = milestoneSummaryMap.get(item.id);
    const internalMilestone = internalMilestoneMap[item.id];
    const raisedAmount = Number(milestoneSummary?.totalDonations ?? 0) + Number(internalMilestone?.amount ?? 0);
    const donorCount = Number(milestoneSummary?.donationEntries ?? milestoneSummary?.donorCount ?? 0) + Number(internalMilestone?.donorCount ?? 0);
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
  const publicRaised = summary?.totalDonations ?? campaign?.public_amount ?? 0;
  const donorCount = summary?.donationEntries ?? summary?.donorCount ?? campaign?.donor_count ?? 0;
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
  res.setHeader("Cache-Control", "public, s-maxage=15, stale-while-revalidate=30");

  try {
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
        }
      });
    }

    const campaignRes = await supabase
      .from("campaigns")
      .select("*")
      .eq("featured", true)
      .eq("is_past", false)
      .limit(1)
      .maybeSingle();

    const campaign = campaignRes.data;
    const [milestoneRes, internalRows] = campaign?.id
      ? await Promise.all([
          supabase.from("campaign_milestones").select("*").eq("campaign_id", campaign.id).order("display_order", { ascending: true }),
          fetchInternalAdjustmentRows(campaign.id)
        ])
      : [{ data: [], error: null }, []];
    const campaignMilestones = milestoneRes.data ?? [];
    const summary = await getDonationSummaryWithMilestones(
      campaignMilestones.map((item: any) => ({
        milestoneId: item.id,
        title: item.title,
        rowStart: Number(item.row_start ?? 0),
        rowEnd: Number(item.row_end ?? 0)
      }))
    ).catch(() => null);
    const internalEntryCount = getInternalDonationEntryCount(internalRows);
    const progress = toProgress(campaign, summary, campaignMilestones, internalEntryCount);

    return res.status(200).json({
      progress,
      campaignMilestones: toCampaignMilestoneMetrics(campaignMilestones, summary, internalRows),
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
          }
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : "Unable to load site metrics."
    });
  }
}
