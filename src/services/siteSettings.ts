import { supabase } from "../lib/supabase";
import { SiteSettingsFormData } from "../types/siteSettings";
import { SiteSettingsRow } from "../types/supabase";

export const SETTINGS_ID = "00000000-0000-0000-0000-000000000001";
const BUCKET = "sbl-assets";

function normalizeLookupLabel(value?: string | null) {
  return value === "SBL Lookup" ? "SBL Donation Lookup" : (value ?? "SBL Donation Lookup");
}

export function toSiteSettingsForm(row?: SiteSettingsRow | null): SiteSettingsFormData {
  return {
    heroTitle: row?.hero_title ?? "",
    heroSummary: row?.hero_summary ?? "",
    donateCtaLabel: row?.donate_cta_label ?? "Donate Now",
    lookupCtaLabel: normalizeLookupLabel(row?.lookup_cta_label),
    lookupCtaUrl: row?.lookup_cta_url ?? "/lookup",
    logoUrl: row?.logo_url ?? "",
    aboutTitle: row?.about_title ?? "About Solid Block Link",
    aboutIntroTitle: row?.about_intro_title ?? "Introduction",
    aboutIntro: row?.about_intro ?? "",
    aboutStoryTitle: row?.about_story_title ?? "Story",
    aboutStory: row?.about_story ?? "",
    aboutMissionTitle: row?.about_mission_title ?? "Mission",
    aboutMission: row?.about_mission ?? "",
    milestoneStepAmount: String(row?.milestone_step_amount ?? 0),
    footerTitle: row?.footer_title ?? "Connect with Solid Block Link",
    footerSummary: row?.footer_summary ?? ""
  };
}

export async function fetchSiteSettings() {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.from("site_settings").select("*").limit(1).maybeSingle<SiteSettingsRow>();
  if (error) throw new Error(error.message);
  return data;
}

export async function saveSiteSettings(values: SiteSettingsFormData) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const payload = {
    id: SETTINGS_ID,
    hero_title: values.heroTitle,
    hero_summary: values.heroSummary,
    donate_cta_label: values.donateCtaLabel,
    lookup_cta_label: normalizeLookupLabel(values.lookupCtaLabel),
    lookup_cta_url: values.lookupCtaUrl,
    logo_url: values.logoUrl,
    about_title: values.aboutTitle,
    about_intro_title: values.aboutIntroTitle,
    about_intro: values.aboutIntro,
    about_story_title: values.aboutStoryTitle,
    about_story: values.aboutStory,
    about_mission_title: values.aboutMissionTitle,
    about_mission: values.aboutMission,
    milestone_step_amount: Number(values.milestoneStepAmount || 0),
    footer_title: values.footerTitle,
    footer_summary: values.footerSummary
  };
  const { error } = await supabase.from("site_settings").upsert(payload, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

export async function uploadSiteLogo(file: File) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const extension = file.name.split(".").pop() || "png";
  const path = `logos/site-logo-${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("bucket") && message.includes("not found")) {
      throw new Error(`Storage bucket "${BUCKET}" not found. Create it in Supabase Storage first.`);
    }
    throw error;
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
