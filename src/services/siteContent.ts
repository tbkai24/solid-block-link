import { getDonationSummary } from "./appsScript";
import { siteContent as fallbackContent } from "../data/mockContent";
import { formatCurrency } from "./format";
import { hasSupabaseEnv, supabase } from "../lib/supabase";
import { SiteContent } from "../types/content";
import { CampaignRow, EmbedRow, SiteSettingsRow, UpdateRow } from "../types/supabase";

type SummaryInput = {
  totalDonations: number;
  donorCount: number;
} | null;

function withSummaryFallback(summary: SummaryInput): SiteContent {
  const publicRaised = summary?.totalDonations ?? 0;
  const donorCount = summary?.donorCount ?? 0;

  return {
    ...fallbackContent,
    progress: {
      ...fallbackContent.progress,
      totalRaised: publicRaised,
      publicRaised,
      donorCount,
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
    currentCampaign: partial.currentCampaign ?? base.currentCampaign,
    progress: partial.progress ?? base.progress,
    updates: partial.updates ?? base.updates,
    embeds: partial.embeds ?? base.embeds,
    pastCampaigns: partial.pastCampaigns ?? base.pastCampaigns,
    donateCta: partial.donateCta ?? base.donateCta,
    lookupCta: partial.lookupCta ?? base.lookupCta
  };
}

function toSettingsPartial(settings: SiteSettingsRow, totalRaised: number): Partial<SiteContent> {
  return {
    logoUrl: settings.logo_url,
    heroTitle: settings.hero_title,
    heroSummary: settings.hero_summary,
    donateCta: { label: settings.donate_cta_label, href: settings.donate_cta_url },
    lookupCta: { label: settings.lookup_cta_label, href: settings.lookup_cta_url },
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

function toProgress(campaign: CampaignRow, summary: SummaryInput) {
  const publicRaised = summary?.totalDonations ?? campaign.public_amount;
  const donorCount = summary?.donorCount ?? campaign.donor_count;
  const totalRaised = publicRaised + campaign.internal_amount;
  const percent = campaign.goal_amount > 0 ? Math.min(Math.round((totalRaised / campaign.goal_amount) * 100), 100) : 0;

  return {
    totalRaised,
    publicRaised,
    donorCount,
    goal: campaign.goal_amount,
    internalRaised: campaign.internal_amount,
    percent,
    lastUpdated: campaign.last_updated
  };
}

function toMilestone(settings: SiteSettingsRow, totalRaised: number) {
  const stepAmount = Number(settings.milestone_step_amount ?? 0);
  if (stepAmount <= 0) return { title: "", nextAmount: 0, isVisible: false };
  const nextAmount = (Math.floor(Math.max(totalRaised, 0) / stepAmount) + 1) * stepAmount;

  return {
    title: `Next milestone: ${formatCurrency(nextAmount)}`,
    nextAmount,
    isVisible: true
  };
}

function toContent(
  settings: SiteSettingsRow,
  campaign: CampaignRow,
  updates: UpdateRow[],
  embeds: EmbedRow[],
  pastCampaigns: CampaignRow[],
  summary: SummaryInput
): SiteContent {
  const progress = toProgress(campaign, summary);

  return {
    logoUrl: settings.logo_url,
    heroTitle: settings.hero_title,
    heroSummary: settings.hero_summary,
    donateCta: { label: settings.donate_cta_label, href: settings.donate_cta_url },
    lookupCta: { label: settings.lookup_cta_label, href: settings.lookup_cta_url },
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
  const donationSummary = await getDonationSummary().catch(() => null);
  if (!hasSupabaseEnv || !supabase) return withSummaryFallback(donationSummary);

  const [settingsRes, campaignRes, updatesRes, embedsRes, pastRes] = await Promise.all([
    supabase.from("site_settings").select("*").limit(1).maybeSingle<SiteSettingsRow>(),
    supabase.from("campaigns").select("*").eq("featured", true).eq("is_past", false).limit(1).maybeSingle<CampaignRow>(),
    supabase.from("updates").select("*").order("published_at", { ascending: false }).limit(8).returns<UpdateRow[]>(),
    supabase.from("embeds").select("*").eq("featured", true).order("display_order", { ascending: true }).limit(4).returns<EmbedRow[]>(),
    supabase.from("campaigns").select("*").eq("is_past", true).order("last_updated", { ascending: false }).limit(6).returns<CampaignRow[]>()
  ]);

  const base = withSummaryFallback(donationSummary);
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
    const progress = toProgress(campaign, donationSummary);
    partial.currentCampaign = {
      id: campaign.id,
      title: campaign.title,
      status: campaign.status,
      summary: campaign.summary,
      outcome: campaign.outcome
    };
    partial.progress = progress;

    if (!settingsRes.error && settingsRes.data) {
      Object.assign(partial, toSettingsPartial(settingsRes.data, progress.totalRaised));
    }

    return mergePartialContent(base, partial);
  }

  return mergePartialContent(base, partial);
}
