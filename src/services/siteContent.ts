import { getDonationSummary, getDonationSummaryForCampaign } from "./appsScript";
import { siteContent as fallbackContent } from "../data/mockContent";
import { formatCurrency } from "./format";
import { hasSupabaseEnv, supabase } from "../lib/supabase";
import { SiteContent } from "../types/content";
import { DonationSummaryMilestoneResponse } from "../types/appsScript";
import { CampaignMilestoneRow, CampaignRow, EmbedRow, InternalAdjustmentRow, UpdateRow } from "../types/supabase";

type SummaryInput = {
  totalDonations: number;
  donorCount: number;
  donationEntries?: number;
  milestones?: DonationSummaryMilestoneResponse[];
} | null;

function getSummaryPublicRaised(summary: SummaryInput) {
  const topLevelTotal = Number(summary?.totalDonations ?? 0);
  if (topLevelTotal > 0) return topLevelTotal;

  return (summary?.milestones ?? []).reduce((sum, item) => sum + Number(item.totalDonations ?? 0), 0);
}

function getSummaryPublicDonors(summary: SummaryInput) {
  const topLevelEntries = Number(summary?.donationEntries ?? 0);
  const topLevelDonors = Number(summary?.donorCount ?? 0);
  if (topLevelEntries > 0) return topLevelEntries;
  if (topLevelDonors > 0) return topLevelDonors;

  return (summary?.milestones ?? []).reduce(
    (sum, item) => sum + Number(item.donationEntries ?? item.donorCount ?? 0),
    0
  );
}

function withSummaryFallback(summary: SummaryInput): SiteContent {
  const publicRaised = getSummaryPublicRaised(summary);
  const donorCount = getSummaryPublicDonors(summary);

  return {
    ...fallbackContent,
    progress: {
      ...fallbackContent.progress,
      totalRaised: publicRaised,
      publicRaised,
      donorCount,
      internalDonorCount: 0,
      lastUpdated: summary ? new Date().toISOString() : fallbackContent.progress.lastUpdated
    }
  };
}

function mergePartialContent(base: SiteContent, partial: Partial<SiteContent>): SiteContent {
  return {
    ...base,
    ...partial,
    about: partial.about ?? base.about,
    footer: partial.footer ?? base.footer,
    milestone: partial.milestone ?? base.milestone,
    campaignMilestones: partial.campaignMilestones ?? base.campaignMilestones,
    currentCampaign: partial.currentCampaign ?? base.currentCampaign,
    homepageCampaigns: partial.homepageCampaigns ?? base.homepageCampaigns,
    progress: partial.progress ?? base.progress,
    updates: partial.updates ?? base.updates,
    embeds: partial.embeds ?? base.embeds,
    pastCampaigns: partial.pastCampaigns ?? base.pastCampaigns,
    donateCta: partial.donateCta ?? base.donateCta,
    lookupCta: partial.lookupCta ?? base.lookupCta
  };
}

function toCampaignItem(campaign: CampaignRow) {
  return {
    id: campaign.id,
    title: campaign.title,
    status: campaign.status,
    summary: campaign.summary,
    outcome: campaign.outcome,
    donateUrl: campaign.donate_url,
    sheetName: campaign.sheet_name,
    homepageOrder: Number(campaign.homepage_order ?? 0),
    goalAmount: Number(campaign.goal_amount ?? 0),
    publicAmount: Number(campaign.public_amount ?? 0),
    internalAmount: Number(campaign.internal_amount ?? 0),
    donorCount: Number(campaign.donor_count ?? 0),
    internalDonorCount: 0
  };
}

function toHomepageCampaignItem(
  campaign: CampaignRow,
  milestoneRows: CampaignMilestoneRow[],
  progress: SiteContent["progress"],
  donationSummary: SummaryInput,
  internalRows: InternalAdjustmentRow[] = []
) {
  return {
    ...toCampaignItem(campaign),
    progress,
    milestone: {
      title: progress.totalRaised > 0 ? `${formatCurrency(progress.totalRaised)} already raised for this campaign.` : "",
      nextAmount: 0,
      isVisible: progress.totalRaised > 0
    },
    campaignMilestones: toCampaignMilestones(
      milestoneRows,
      donationSummary,
      internalRows,
      campaign
    ),
    milestoneCount: milestoneRows.length
  };
}

function createInternalMilestoneMap(rows: InternalAdjustmentRow[]) {
  return rows.reduce<Record<string, { amount: number; donorCount: number }>>((acc, item) => {
    if (!item.milestone_id) return acc;

    const current = acc[item.milestone_id] ?? { amount: 0, donorCount: 0 };
    acc[item.milestone_id] = {
      amount: current.amount + Number(item.amount ?? 0),
      donorCount: current.donorCount + 1
    };
    return acc;
  }, {});
}

function getInternalDonationEntryCount(rows: InternalAdjustmentRow[] = []) {
  return rows.length;
}

async function fetchInternalDonorCounts(campaignIds: string[]) {
  const counts = new Map<string, number>();
  if (!supabase || !campaignIds.length) return counts;

  const rpcRes = await supabase.rpc("get_internal_donor_counts", {
    campaign_ids: campaignIds
  });

  if (!rpcRes.error) {
    (rpcRes.data ?? []).forEach((item: { campaign_id?: string; donor_count?: number }) => {
      if (item.campaign_id) counts.set(item.campaign_id, Number(item.donor_count ?? 0));
    });

    return counts;
  }

  const fallbackRes = await supabase
    .from("campaign_internal_adjustments")
    .select("campaign_id")
    .in("campaign_id", campaignIds);

  if (!fallbackRes.error) {
    (fallbackRes.data ?? []).forEach((item) => {
      const campaignId = String(item.campaign_id ?? "");
      if (!campaignId) return;
      counts.set(campaignId, (counts.get(campaignId) ?? 0) + 1);
    });
  }

  return counts;
}

async function fetchInternalAdjustmentRows(campaignId: string): Promise<InternalAdjustmentRow[]> {
  if (!supabase) return [];

  const primary = await supabase
    .from("campaign_internal_adjustments")
    .select("id, campaign_id, milestone_id, name, amount, notes, added_at")
    .eq("campaign_id", campaignId);

  if (!primary.error) {
    return (primary.data ?? []) as InternalAdjustmentRow[];
  }

  const fallback = await supabase
    .from("campaign_internal_adjustments")
    .select("id, campaign_id, label, amount, notes, added_at")
    .eq("campaign_id", campaignId);

  if (fallback.error) throw fallback.error;

  return (fallback.data ?? []).map((item) => ({
    id: String(item.id),
    campaign_id: String(item.campaign_id),
    milestone_id: null,
    name: String((item as { label?: string | null }).label ?? ""),
    amount: Number(item.amount ?? 0),
    notes: String(item.notes ?? ""),
    added_at: String(item.added_at ?? "")
  }));
}

function toCampaignMilestones(
  rows: CampaignMilestoneRow[],
  summary: SummaryInput,
  internalRows: InternalAdjustmentRow[] = [],
  fallbackCampaign?: CampaignRow | null
) {
  const milestoneSummaryMap = new Map(
    (summary?.milestones ?? []).map((item) => [item.milestoneId, item])
  );
  const internalMilestoneMap = createInternalMilestoneMap(internalRows);

  const campaignPublicRaised = Math.max(getSummaryPublicRaised(summary), Number(fallbackCampaign?.public_amount ?? 0));
  const campaignPublicDonors = Math.max(getSummaryPublicDonors(summary), Number(fallbackCampaign?.donor_count ?? 0));

  const unassignedInternal = internalRows.filter((item) => !item.milestone_id);
  const unassignedInternalAmount = unassignedInternal.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
  const unassignedInternalDonors = unassignedInternal.length;

  const totalMilestonesPublicRaised = (summary?.milestones ?? []).reduce(
    (sum, item) => sum + Number(item.totalDonations ?? 0),
    0
  );
  const hasSpecificPublicBreakdown = milestoneSummaryMap.size > 0 && totalMilestonesPublicRaised > 0;

  const activeIndex = (rows ?? []).findIndex((r) => {
    const s = String(r?.status ?? "").toLowerCase();
    return s === "active" || s === "ongoing";
  });
  const primaryIndex = activeIndex >= 0 ? activeIndex : 0;

  return rows.map((item, index) => {
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
      note: item.note ?? "",
    };
  });
}

function getCombinedMilestoneTarget(rows: CampaignMilestoneRow[]) {
  return rows.reduce((sum, item) => sum + Number(item.target_amount ?? 0), 0);
}

function toProgress(
  campaign: CampaignRow,
  summary: SummaryInput,
  campaignMilestones: CampaignMilestoneRow[] = [],
  internalDonorCount = 0
) {
  const summaryPublicRaised = getSummaryPublicRaised(summary);
  const summaryPublicDonors = getSummaryPublicDonors(summary);
  const isSummaryOk = Boolean(summary && (summary as { ok?: boolean }).ok !== false);
  const publicRaised = (isSummaryOk && summaryPublicRaised > 0) ? summaryPublicRaised : Number(campaign?.public_amount ?? 0);
  const donorCount = (isSummaryOk && summaryPublicDonors > 0) ? summaryPublicDonors : Number(campaign?.donor_count ?? 0);
  const totalRaised = publicRaised + campaign.internal_amount;
  const goal = getCombinedMilestoneTarget(campaignMilestones) || campaign.goal_amount;
  const percent = goal > 0
    ? Math.min(Math.round(((totalRaised / goal) * 100) * 100) / 100, 100)
    : 0;

  return {
    totalRaised,
    publicRaised,
    donorCount,
    internalDonorCount,
    goal,
    internalRaised: campaign.internal_amount,
    percent,
    lastUpdated: campaign.last_updated
  };
}

function toMilestone(totalRaised: number) {
  if (totalRaised <= 0) return { title: "", nextAmount: 0, isVisible: false };

  return {
    title: `${formatCurrency(totalRaised)} already raised for this campaign.`,
    nextAmount: 0,
    isVisible: true
  };
}

export async function getSiteContent(): Promise<SiteContent> {
  const initialDonationSummaryPromise = getDonationSummary().catch(() => null);
  const initialDonationSummary = await initialDonationSummaryPromise;
  if (!hasSupabaseEnv || !supabase) return withSummaryFallback(initialDonationSummary);

  const [campaignsRes, updatesRes, embedsRes, archiveRes] = await Promise.all([
    supabase
      .from("campaigns")
      .select("*")
      .eq("is_past", false)
      .eq("status", "Active")
      .order("homepage_order", { ascending: true })
      .order("last_updated", { ascending: false })
      .limit(6)
      .returns<CampaignRow[]>(),
    supabase.from("updates").select("*").order("published_at", { ascending: false }).limit(8).returns<UpdateRow[]>(),
    supabase.from("embeds").select("*").eq("featured", true).order("display_order", { ascending: true }).limit(4).returns<EmbedRow[]>(),
    supabase.from("campaigns").select("*").order("last_updated", { ascending: false }).limit(24).returns<CampaignRow[]>()
  ]);

  const base = withSummaryFallback(initialDonationSummary);
  const partial: Partial<SiteContent> = {};
  const archiveCampaigns = archiveRes.data ?? [];
  const archiveTargetByCampaign = new Map<string, number>();
  const archiveInternalDonorsByCampaign = new Map<string, number>();
  const archiveSummaryByCampaign = new Map<string, SummaryInput>();
  let archiveMilestoneRows: CampaignMilestoneRow[] = [];

  if (!archiveRes.error && archiveCampaigns.length) {
    const archiveCampaignIds = archiveCampaigns.map((item) => item.id);
    const [archiveMilestoneRes, internalDonorCounts] = await Promise.all([
      supabase
        .from("campaign_milestones")
        .select("*")
        .order("display_order", { ascending: true })
        .in("campaign_id", archiveCampaignIds),
      fetchInternalDonorCounts(archiveCampaignIds)
    ]);
    internalDonorCounts.forEach((count, campaignId) => {
      archiveInternalDonorsByCampaign.set(campaignId, count);
    });

    archiveMilestoneRows = !archiveMilestoneRes.error ? ((archiveMilestoneRes.data ?? []) as CampaignMilestoneRow[]) : [];

    if (archiveMilestoneRows.length) {
      archiveMilestoneRows.forEach((item) => {
        const campaignId = String(item.campaign_id ?? "");
        if (!campaignId) return;
        archiveTargetByCampaign.set(
          campaignId,
          (archiveTargetByCampaign.get(campaignId) ?? 0) + Number(item.target_amount ?? 0)
        );
      });

      await Promise.all(archiveCampaigns.map(async (campaign) => {
        const milestoneRows = archiveMilestoneRows.filter((item) => item.campaign_id === campaign.id);
        const summary = await getDonationSummaryForCampaign(
          milestoneRows.map((item) => ({
            milestoneId: item.id,
            title: item.title,
            rowStart: Number(item.row_start ?? 0),
            rowEnd: Number(item.row_end ?? 0)
          })),
          { sheetName: campaign.sheet_name }
        ).catch(() => null);

        archiveSummaryByCampaign.set(campaign.id, summary);
      }));
    }

  }

  if (!updatesRes.error) {
    partial.updates = (Array.isArray(updatesRes.data) ? updatesRes.data : []).map((item) => ({
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
    }));
  }

  if (!embedsRes.error) {
    partial.embeds = (Array.isArray(embedsRes.data) ? embedsRes.data : []).map((item) => ({
      id: item.id,
      title: item.title,
      platform: item.platform,
      embedNote: item.embed_note
    }));
  }

  if (!archiveRes.error) {
    partial.pastCampaigns = archiveCampaigns.map((item) => {
      const liveSummary = archiveSummaryByCampaign.get(item.id) ?? null;
      const livePublicAmount = getSummaryPublicRaised(liveSummary);
      const livePublicDonors = getSummaryPublicDonors(liveSummary);
      const milestoneRows = archiveMilestoneRows.filter((row) => row.campaign_id === item.id);

      return {
        id: item.id,
        title: item.title,
        status: item.status,
        summary: item.summary,
        outcome: item.outcome,
        goalAmount: archiveTargetByCampaign.get(item.id) || Number(item.goal_amount ?? 0),
        publicAmount: liveSummary ? livePublicAmount : Number(item.public_amount ?? 0),
        internalAmount: Number(item.internal_amount ?? 0),
        donorCount: liveSummary ? livePublicDonors : Number(item.donor_count ?? 0),
        internalDonorCount: archiveInternalDonorsByCampaign.get(item.id) ?? 0,
        campaignMilestones: toCampaignMilestones(milestoneRows, liveSummary, [], item),
        milestoneCount: milestoneRows.length
      };
    });
  }

  if (!campaignsRes.error && (campaignsRes.data ?? []).length) {
    const featuredCampaigns = campaignsRes.data ?? [];
    const featuredIds = featuredCampaigns.map((item) => item.id);
    const milestoneRes = await supabase
      .from("campaign_milestones")
      .select("*")
      .in("campaign_id", featuredIds)
      .order("display_order", { ascending: true })
      .returns<CampaignMilestoneRow[]>();
    const allMilestoneRows = !milestoneRes.error ? (milestoneRes.data ?? []) : [];

    const metricsByCampaign = await Promise.all(featuredCampaigns.map(async (campaign) => {
      const milestoneRows = allMilestoneRows.filter((item) => item.campaign_id === campaign.id);
      const [internalRows, donationSummary] = await Promise.all([
        fetchInternalAdjustmentRows(campaign.id),
        getDonationSummaryForCampaign(
          milestoneRows.map((item) => ({
            milestoneId: item.id,
            title: item.title,
            rowStart: Number(item.row_start ?? 0),
            rowEnd: Number(item.row_end ?? 0)
          })),
          { sheetName: campaign.sheet_name }
        ).catch(() => null)
      ]);
      const internalEntryCount = getInternalDonationEntryCount(internalRows);
      const progress = toProgress(campaign, donationSummary, milestoneRows, internalEntryCount);

      return {
        campaign,
        milestoneRows,
        internalRows,
        donationSummary,
        progress
      };
    }));

    const primary = metricsByCampaign[0];
    partial.currentCampaign = toCampaignItem(primary.campaign);
    partial.progress = primary.progress;
    partial.campaignMilestones = toCampaignMilestones(
      primary.milestoneRows,
      primary.donationSummary,
      primary.internalRows,
      primary.campaign
    );
    partial.homepageCampaigns = metricsByCampaign.map((item) =>
      toHomepageCampaignItem(item.campaign, item.milestoneRows, item.progress, item.donationSummary, item.internalRows)
    );

    partial.milestone = toMilestone(primary.progress.totalRaised);

    return mergePartialContent(base, partial);
  }

  if (!campaignsRes.error) {
    partial.currentCampaign = {
      id: "",
      title: "",
      status: "Active",
      summary: "",
      outcome: "",
      donateUrl: "",
      sheetName: "",
      homepageOrder: 0
    };
    partial.homepageCampaigns = [];
    partial.campaignMilestones = [];
  }

  return mergePartialContent(base, partial);
}
