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

async function getDonationSummary() {
  if (!appsScriptUrl) return null;

  const response = await fetch(`${appsScriptUrl}?action=summary`);
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

function toMilestone(stepAmount: number, totalRaised: number) {
  if (stepAmount <= 0) {
    return { title: "", nextAmount: 0, isVisible: false };
  }

  const nextAmount = (Math.floor(Math.max(totalRaised, 0) / stepAmount) + 1) * stepAmount;

  return {
    title: `Next milestone: ${formatCurrency(nextAmount)}`,
    nextAmount,
    isVisible: true
  };
}

function toProgress(campaign: any, summary: any) {
  const publicRaised = summary?.totalDonations ?? campaign?.public_amount ?? 0;
  const donorCount = summary?.donorCount ?? campaign?.donor_count ?? 0;
  const internalRaised = campaign?.internal_amount ?? 0;
  const goal = campaign?.goal_amount ?? 0;
  const totalRaised = publicRaised + internalRaised;
  const percent = goal > 0
    ? Math.min(Math.round(((totalRaised / goal) * 100) * 100) / 100, 100)
    : 0;

  return {
    totalRaised,
    publicRaised,
    donorCount,
    goal,
    internalRaised,
    percent,
    lastUpdated: campaign?.last_updated ?? ""
  };
}

export default async function handler(_req: any, res: any) {
  res.setHeader("Cache-Control", "public, s-maxage=15, stale-while-revalidate=300");

  try {
    const summary = await getDonationSummary().catch(() => null);
    const base = createEmptyContent();

    if (!supabase) {
      const publicRaised = summary?.totalDonations ?? 0;
      const donorCount = summary?.donorCount ?? 0;

      return res.status(200).json({
        ...base,
        progress: {
          ...base.progress,
          totalRaised: publicRaised,
          publicRaised,
          donorCount,
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
    const progress = toProgress(campaign, summary);

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
      milestone: toMilestone(Number(settings?.milestone_step_amount ?? 0), progress.totalRaised),
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
