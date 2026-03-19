import { DonationSummaryResponse } from "../types/appsScript";

const appsScriptUrl = (import.meta.env.VITE_APPS_SCRIPT_URL || "").trim();

export async function getDonationSummary() {
  if (!appsScriptUrl) return null;

  const response = await fetch(`${appsScriptUrl}?action=summary`);
  const data = (await response.json()) as DonationSummaryResponse;

  if (!response.ok || !data.ok) {
    throw new Error(data.message || "Apps Script summary fetch failed.");
  }

  return data;
}
