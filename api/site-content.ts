import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const appsScriptUrl = (process.env.APPS_SCRIPT_URL || process.env.VITE_APPS_SCRIPT_URL || "").trim();

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

function normalizeLookupLabel(value?: string | null) {
  return value === "SBL Lookup" ? "SBL Donation Lookup" : (value ?? "SBL Donation Lookup");
}

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

async function getDonationSummary() {
  return getDonationSummaryWithMilestones();
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

function createEmptyContent() {
  return {
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

function toCampaignMilestones(rows: any[], summary: any, internalRows: any[] = [], internalDonorCount = 0) {
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
    const summary = await getDonationSummary().catch(() => null);
    const base = createEmptyContent();

    if (!supabase) {
      const publicRaised = summary?.totalDonations ?? 0;
      const donorCount = summary?.donationEntries ?? summary?.donorCount ?? 0;

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

    const [settingsRes, campaignRes, updatesRes, embedsRes, pastRes] = await Promise.all([
      supabase.from("site_settings").select("*").limit(1).maybeSingle(),
      supabase.from("campaigns").select("*").eq("featured", true).eq("is_past", false).limit(1).maybeSingle(),
      supabase.from("updates").select("*").order("published_at", { ascending: false }).limit(8),
      supabase.from("embeds").select("*").eq("featured", true).order("display_order", { ascending: true }).limit(4),
      supabase.from("campaigns").select("*").eq("is_past", true).order("last_updated", { ascending: false }).limit(6)
    ]);

    const settings = settingsRes.data;
    const campaign = campaignRes.data;
    const [milestoneRes, internalRowsRes] = campaign?.id
      ? await Promise.all([
          supabase.from("campaign_milestones").select("*").eq("campaign_id", campaign.id).order("display_order", { ascending: true }),
          supabase.from("campaign_internal_adjustments").select("id, campaign_id, milestone_id, name, amount, notes, added_at").eq("campaign_id", campaign.id)
        ])
      : [{ data: [], error: null }, { data: [], error: null }];
    const campaignMilestones = milestoneRes.data ?? [];
    const internalEntryCount = getInternalDonationEntryCount(internalRowsRes.data ?? []);
    const milestoneSummary = await getDonationSummaryWithMilestones(
      campaignMilestones.map((item: any) => ({
        milestoneId: item.id,
        title: item.title,
        rowStart: Number(item.row_start ?? 0),
        rowEnd: Number(item.row_end ?? 0)
      }))
    ).catch(() => summary);
    const progress = toProgress(campaign, milestoneSummary, campaignMilestones, internalEntryCount);

    const payload = {
      ...base,
      logoUrl: settings?.logo_url ?? "",
      heroTitle: settings?.hero_title ?? "",
      heroSummary: settings?.hero_summary ?? "",
      donateCta: {
        label: settings?.donate_cta_label ?? "Donate Now",
        href: settings?.donate_cta_url ?? "#"
      },
      lookupCta: {
        label: normalizeLookupLabel(settings?.lookup_cta_label),
        href: settings?.lookup_cta_url ?? "#"
      },
      about: {
        title: settings?.about_title ?? "",
        introTitle: settings?.about_intro_title ?? "",
        intro: settings?.about_intro ?? "",
        storyTitle: settings?.about_story_title ?? "",
        story: settings?.about_story ?? "",
        missionTitle: settings?.about_mission_title ?? "",
        mission: settings?.about_mission ?? ""
      },
      footer: {
        title: settings?.footer_title ?? "",
        summary: settings?.footer_summary ?? ""
      },
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
        internalRowsRes.data ?? [],
        internalEntryCount
      ),
      currentCampaign: {
        id: campaign?.id ?? "",
        title: campaign?.title ?? "",
        status: campaign?.status ?? "Active",
        summary: campaign?.summary ?? "",
        outcome: campaign?.outcome ?? ""
      },
      progress,
      updates: (updatesRes.data ?? []).map((item: any) => ({
        id: item.id,
        title: item.title,
        summary: item.summary,
        label: item.content_label,
        platform: item.platform,
        date: new Date(item.published_at).toLocaleDateString(),
        href: item.href,
        featured: item.featured
      })),
      embeds: (embedsRes.data ?? []).map((item: any) => ({
        id: item.id,
        title: item.title,
        platform: item.platform,
        embedNote: item.embed_note
      })),
      pastCampaigns: (pastRes.data ?? []).map((item: any) => ({
        id: item.id,
        title: item.title,
        status: item.status,
        summary: item.summary,
        outcome: item.outcome
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
