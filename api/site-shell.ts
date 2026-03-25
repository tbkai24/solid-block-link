import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supabaseServerKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "";

const supabase = supabaseUrl && supabaseServerKey
  ? createClient(supabaseUrl, supabaseServerKey)
  : null;

function normalizeLookupLabel(value?: string | null) {
  return value === "SBL Lookup" ? "SBL Donation Lookup" : (value ?? "SBL Donation Lookup");
}

function getCombinedMilestoneTarget(rows: any[]) {
  return (rows ?? []).reduce((sum: number, item: any) => sum + Number(item?.target_amount ?? 0), 0);
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

function toShellProgress(campaign: any, milestoneRows: any[] = []) {
  const publicRaised = Number(campaign?.public_amount ?? 0);
  const internalRaised = Number(campaign?.internal_amount ?? 0);
  const totalRaised = publicRaised + internalRaised;
  const goal = getCombinedMilestoneTarget(milestoneRows) || Number(campaign?.goal_amount ?? 0);
  const percent = goal > 0
    ? Math.min(Math.round(((totalRaised / goal) * 100) * 100) / 100, 100)
    : 0;

  return {
    totalRaised,
    publicRaised,
    donorCount: Number(campaign?.donor_count ?? 0),
    internalDonorCount: 0,
    goal,
    internalRaised,
    percent,
    lastUpdated: campaign?.last_updated ?? ""
  };
}

function toShellMilestone(totalRaised: number) {
  return totalRaised > 0
    ? {
        title: "",
        nextAmount: 0,
        isVisible: true
      }
    : {
        title: "",
        nextAmount: 0,
        isVisible: false
      };
}

export default async function handler(_req: any, res: any) {
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");

  try {
    const base = createEmptyContent();

    if (!supabase) {
      return res.status(200).json(base);
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
    const milestoneRes = campaign?.id
      ? await supabase.from("campaign_milestones").select("*").eq("campaign_id", campaign.id).order("display_order", { ascending: true })
      : { data: [], error: null };
    const milestoneRows = milestoneRes.data ?? [];
    const progress = toShellProgress(campaign, milestoneRows);

    return res.status(200).json({
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
      milestone: toShellMilestone(progress.totalRaised),
      campaignMilestones: milestoneRows.map((item: any) => ({
        id: item.id,
        title: item.title,
        targetAmount: Number(item.target_amount ?? 0),
        rowStart: Number(item.row_start ?? 0),
        rowEnd: Number(item.row_end ?? 0),
        status: item.status ?? "Active",
        displayOrder: Number(item.display_order ?? 0),
        raisedAmount: 0,
        donorCount: 0,
        percent: 0,
        note: item.note ?? ""
      })),
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
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : "Unable to load site shell."
    });
  }
}
