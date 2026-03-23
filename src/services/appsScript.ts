import { DonationSummaryMilestoneInput, DonationSummaryResponse } from "../types/appsScript";

const appsScriptUrl = (import.meta.env.VITE_APPS_SCRIPT_URL || "").trim();

export async function getDonationSummary(milestones: DonationSummaryMilestoneInput[] = []) {
  if (!appsScriptUrl) return null;

  const query = new URLSearchParams({ action: "summary" });

  if (milestones.length) {
    query.set("milestones", JSON.stringify(milestones));
  }

  const response = await fetch(`${appsScriptUrl}?${query.toString()}`);
  const data = (await response.json()) as DonationSummaryResponse;

  if (!response.ok || !data.ok) {
    throw new Error(data.message || "Apps Script summary fetch failed.");
  }

  return data;
}
