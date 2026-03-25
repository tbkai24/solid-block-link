import { getDonationSummary } from "./appsScript";
import { siteContent as fallbackContent } from "../data/mockContent";
import { formatCurrency } from "./format";
import { hasSupabaseEnv, supabase } from "../lib/supabase";
import { SiteContent } from "../types/content";
import { DonationSummaryMilestoneResponse } from "../types/appsScript";
import { CampaignMilestoneRow, CampaignRow, EmbedRow, InternalAdjustmentRow, SiteSettingsRow, UpdateRow } from "../types/supabase";

type SummaryInput = {
  totalDonations: number;
  donorCount: number;
  donationEntries?: number;
  milestones?: DonationSummaryMilestoneResponse[];
} | null;

function normalizeLookupLabel(value?: string | null) {
  return value === "SBL Lookup" ? "SBL Donation Lookup" : (value ?? "SBL Donation Lookup");
}

function withSummaryFallback(summary: SummaryInput): SiteContent {
  const publicRaised = summary?.totalDonations ?? 0;
  const donorCount = summary?.donationEntries ?? summary?.donorCount ?? 0;

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
    progress: partial.progress ?? base.progress,
    updates: partial.updates ?? base.updates,
    embeds: partial.embeds ?? base.embeds,
    pastCampaigns: partial.pastCampaigns ?? base.pastCampaigns,
    donateCta: partial.donateCta ?? base.donateCta,
    lookupCta: partial.lookupCta ?? base.lookupCta
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
  internalDonorCount = 0
) {
  const milestoneSummaryMap = new Map(
    (summary?.milestones ?? []).map((item) => [item.milestoneId, item])
  );
  const internalMilestoneMap = createInternalMilestoneMap(internalRows);

  return rows.map((item) => {
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

function toSettingsPartial(settings: SiteSettingsRow, totalRaised: number): Partial<SiteContent> {
  return {
    logoUrl: settings.logo_url,
    heroTitle: settings.hero_title,
    heroSummary: settings.hero_summary,
    donateCta: { label: settings.donate_cta_label, href: settings.donate_cta_url },
    lookupCta: { label: normalizeLookupLabel(settings.lookup_cta_label), href: settings.lookup_cta_url },
    about: {
      title: settings.about_title,
      introTitle: settings.about_intro_title,
      intro: settings.about_intro,
      storyTitle: settings.about_story_title,
      story: settings.about_story,
      missionTitle: settings.about_mission_title,
      mission: settings.about_mission
    },
    footer: {
      title: settings.footer_title,
      summary: settings.footer_summary
    },
    milestone: toMilestone(settings, totalRaised)
  };
}

function toProgress(
  campaign: CampaignRow,
  summary: SummaryInput,
  campaignMilestones: CampaignMilestoneRow[] = [],
  internalDonorCount = 0
) {
  const publicRaised = summary?.totalDonations ?? campaign.public_amount;
  const donorCount = summary?.donationEntries ?? summary?.donorCount ?? campaign.donor_count;
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

function toMilestone(settings: SiteSettingsRow, totalRaised: number) {
  if (totalRaised <= 0) return { title: "", nextAmount: 0, isVisible: false };

  return {
    title: `${formatCurrency(totalRaised)} already raised for this campaign.`,
    nextAmount: 0,
    isVisible: true
  };
}

function toContent(
  settings: SiteSettingsRow,
  campaign: CampaignRow,
  campaignMilestones: CampaignMilestoneRow[],
  updates: UpdateRow[],
  embeds: EmbedRow[],
  pastCampaigns: CampaignRow[],
  summary: SummaryInput
): SiteContent {
  const progress = toProgress(campaign, summary, campaignMilestones);

  return {
    logoUrl: settings.logo_url,
    heroTitle: settings.hero_title,
    heroSummary: settings.hero_summary,
    donateCta: { label: settings.donate_cta_label, href: settings.donate_cta_url },
    lookupCta: { label: normalizeLookupLabel(settings.lookup_cta_label), href: settings.lookup_cta_url },
    about: {
      title: settings.about_title,
      introTitle: settings.about_intro_title,
      intro: settings.about_intro,
      storyTitle: settings.about_story_title,
      story: settings.about_story,
      missionTitle: settings.about_mission_title,
      mission: settings.about_mission
    },
    milestone: toMilestone(settings, progress.totalRaised),
    footer: {
      title: settings.footer_title,
      summary: settings.footer_summary
    },
    campaignMilestones: toCampaignMilestones(campaignMilestones, summary),
    currentCampaign: {
      id: campaign.id,
      title: campaign.title,
      status: campaign.status,
      summary: campaign.summary,
      outcome: campaign.outcome
    },
    progress,
    updates: updates.map((item) => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
      label: item.content_label,
      platform: item.platform,
      date: new Date(item.published_at).toLocaleDateString(),
      href: item.href,
      featured: item.featured
    })),
    embeds: embeds.map((item) => ({
      id: item.id,
      title: item.title,
      platform: item.platform,
      embedNote: item.embed_note
    })),
    pastCampaigns: pastCampaigns.map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      summary: item.summary,
      outcome: item.outcome
    }))
  };
}

export async function getSiteContent(): Promise<SiteContent> {
  const initialDonationSummaryPromise = getDonationSummary().catch(() => null);
  const initialDonationSummary = await initialDonationSummaryPromise;
  if (!hasSupabaseEnv || !supabase) return withSummaryFallback(initialDonationSummary);

  const [settingsRes, campaignRes, updatesRes, embedsRes, pastRes] = await Promise.all([
    supabase.from("site_settings").select("*").limit(1).maybeSingle<SiteSettingsRow>(),
    supabase.from("campaigns").select("*").eq("featured", true).eq("is_past", false).limit(1).maybeSingle<CampaignRow>(),
    supabase.from("updates").select("*").order("published_at", { ascending: false }).limit(8).returns<UpdateRow[]>(),
    supabase.from("embeds").select("*").eq("featured", true).order("display_order", { ascending: true }).limit(4).returns<EmbedRow[]>(),
    supabase.from("campaigns").select("*").eq("is_past", true).order("last_updated", { ascending: false }).limit(6).returns<CampaignRow[]>()
  ]);

  const base = withSummaryFallback(initialDonationSummary);
  const partial: Partial<SiteContent> = {};

  if (!settingsRes.error && settingsRes.data) {
    Object.assign(partial, toSettingsPartial(settingsRes.data, base.progress.totalRaised));
  }

  if (!updatesRes.error) {
    partial.updates = (updatesRes.data ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
      label: item.content_label,
      platform: item.platform,
      date: new Date(item.published_at).toLocaleDateString(),
      href: item.href,
      featured: item.featured
    }));
  }

  if (!embedsRes.error) {
    partial.embeds = (embedsRes.data ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      platform: item.platform,
      embedNote: item.embed_note
    }));
  }

  if (!pastRes.error) {
    partial.pastCampaigns = (pastRes.data ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      summary: item.summary,
      outcome: item.outcome
    }));
  }

  if (!campaignRes.error && campaignRes.data) {
    const campaign = campaignRes.data;
    const [milestoneRes, internalRows] = await Promise.all([
      supabase
        .from("campaign_milestones")
        .select("*")
        .eq("campaign_id", campaign.id)
        .order("display_order", { ascending: true })
        .returns<CampaignMilestoneRow[]>(),
      fetchInternalAdjustmentRows(campaign.id)
    ]);
    const milestoneRows = !milestoneRes.error ? (milestoneRes.data ?? []) : [];
    const donationSummaryPromise = getDonationSummary(
      milestoneRows.map((item) => ({
        milestoneId: item.id,
        title: item.title,
        rowStart: Number(item.row_start ?? 0),
        rowEnd: Number(item.row_end ?? 0)
      }))
    ).catch(() => initialDonationSummaryPromise);
    const donationSummary = await donationSummaryPromise;
    const internalEntryCount = getInternalDonationEntryCount(internalRows);
    const progress = toProgress(campaign, donationSummary, milestoneRows, internalEntryCount);
    partial.currentCampaign = {
      id: campaign.id,
      title: campaign.title,
      status: campaign.status,
      summary: campaign.summary,
      outcome: campaign.outcome
    };
    partial.progress = progress;
    partial.campaignMilestones = toCampaignMilestones(
      milestoneRows,
      donationSummary,
      internalRows,
      internalEntryCount
    );

    if (!settingsRes.error && settingsRes.data) {
      Object.assign(partial, toSettingsPartial(settingsRes.data, progress.totalRaised));
    }

    return mergePartialContent(base, partial);
  }

  return mergePartialContent(base, partial);
}
