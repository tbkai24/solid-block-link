import { createClient } from "@supabase/supabase-js";
import { getEnv } from "./env.js";

export type DonationMilestoneInput = {
  milestoneId: string;
  title: string;
  rowStart: number;
  rowEnd: number;
};

export type DonationSummary = {
  ok?: boolean;
  message?: string;
  totalDonations?: number;
  donorCount?: number;
  donationEntries?: number;
  milestones?: Array<{
    milestoneId: string;
    title?: string;
    rowStart?: number;
    rowEnd?: number;
    totalDonations?: number;
    donorCount?: number;
    donationEntries?: number;
  }>;
};

export function getSupabaseUrl() {
  return getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL") || "";
}

export function getSupabaseServerKey() {
  return (
    getEnv("SUPABASE_SERVICE_ROLE_KEY") ||
    getEnv("SUPABASE_ANON_KEY") ||
    getEnv("VITE_SUPABASE_ANON_KEY") ||
    ""
  );
}

export function getAppsScriptUrl() {
  return (getEnv("VITE_APPS_SCRIPT_URL") || getEnv("APPS_SCRIPT_URL") || "").trim();
}

export function getSupabase() {
  const url = getSupabaseUrl();
  const key = getSupabaseServerKey();
  if (!url || !key) return null;
  return createClient(url, key);
}

export const supabaseUrl = getSupabaseUrl();
export const supabaseServerKey = getSupabaseServerKey();
export const appsScriptUrl = getAppsScriptUrl();
export const supabase = getSupabase();

export function getSummaryPublicRaised(summary: DonationSummary | null | undefined) {
  const topLevelTotal = Number(summary?.totalDonations ?? 0);
  if (topLevelTotal > 0) return topLevelTotal;

  return (summary?.milestones ?? []).reduce((sum, item) => sum + Number(item?.totalDonations ?? 0), 0);
}

export function getSummaryPublicDonors(summary: DonationSummary | null | undefined) {
  const topLevelEntries = Number(summary?.donationEntries ?? 0);
  const topLevelDonors = Number(summary?.donorCount ?? 0);
  if (topLevelEntries > 0) return topLevelEntries;
  if (topLevelDonors > 0) return topLevelDonors;

  return (summary?.milestones ?? []).reduce(
    (sum, item) => sum + Number(item?.donationEntries ?? item?.donorCount ?? 0),
    0
  );
}

export async function fetchAppsScriptSummary(
  milestones: DonationMilestoneInput[] = [],
  sheetName = "",
  timeoutMs = 8000
) {
  const url = getAppsScriptUrl();
  if (!url) return null;

  const query = new URLSearchParams({ action: "summary" });

  if (milestones.length) {
    query.set("milestones", JSON.stringify(milestones));
  }

  if (sheetName.trim()) {
    query.set("sheetName", sheetName.trim());
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const response = await fetch(`${url}?${query.toString()}`, {
    signal: controller.signal
  }).finally(() => clearTimeout(timeoutId));
  const data = (await response.json()) as DonationSummary;

  if (!response.ok || !data?.ok) {
    throw new Error(data?.message || "Apps Script summary fetch failed.");
  }

  return data;
}

export async function getCachedDonationSummary(campaignId?: string | null) {
  const client = getSupabase();
  if (!client || !campaignId) return null;

  const result = await client
    .from("campaign_donation_snapshots")
    .select("summary, public_amount, donor_count, fetched_at, fetch_status")
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (result.error || !result.data || result.data.fetch_status !== "success") {
    return null;
  }

  return (result.data.summary ?? null) as DonationSummary | null;
}

export async function upsertDonationSnapshot(campaignId: string, summary: DonationSummary) {
  const client = getSupabase();
  if (!client) return;

  const publicAmount = getSummaryPublicRaised(summary);
  const donorCount = getSummaryPublicDonors(summary);
  const fetchedAt = new Date().toISOString();

  await client.from("campaign_donation_snapshots").upsert({
    campaign_id: campaignId,
    summary,
    public_amount: publicAmount,
    donor_count: donorCount,
    fetched_at: fetchedAt,
    fetch_status: "success",
    error_message: ""
  });

  await client
    .from("campaigns")
    .update({
      public_amount: publicAmount,
      donor_count: donorCount,
      last_updated: fetchedAt
    })
    .eq("id", campaignId);
}

export async function markDonationSnapshotError(campaignId: string, message: string) {
  const client = getSupabase();
  if (!client) return;

  await client.from("campaign_donation_snapshots").upsert({
    campaign_id: campaignId,
    summary: {},
    public_amount: 0,
    donor_count: 0,
    fetched_at: new Date().toISOString(),
    fetch_status: "error",
    error_message: message.slice(0, 500)
  });
}
