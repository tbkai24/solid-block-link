import { DonationSummaryMilestoneInput, DonationSummaryResponse } from "../types/appsScript";

const appsScriptUrl = (import.meta.env.VITE_APPS_SCRIPT_URL || "").trim();
const APPS_SCRIPT_TIMEOUT_MS = 8000;

function createTimeoutController(timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    clear() {
      window.clearTimeout(timeoutId);
    }
  };
}

export async function getDonationSummary(milestones: DonationSummaryMilestoneInput[] = []) {
  return getDonationSummaryForCampaign(milestones);
}

export async function getDonationSummaryForCampaign(
  milestones: DonationSummaryMilestoneInput[] = [],
  options?: { sheetName?: string }
) {
  if (!appsScriptUrl) return null;

  const query = new URLSearchParams({ action: "summary" });

  if (milestones.length) {
    query.set("milestones", JSON.stringify(milestones));
  }

  if (options?.sheetName?.trim()) {
    query.set("sheetName", options.sheetName.trim());
  }

  const request = createTimeoutController(APPS_SCRIPT_TIMEOUT_MS);

  try {
    const response = await fetch(`${appsScriptUrl}?${query.toString()}`, {
      signal: request.signal
    });
    const data = (await response.json()) as DonationSummaryResponse;

    if (!response.ok || !data.ok) {
      throw new Error(data.message || "Apps Script summary fetch failed.");
    }

    return data;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Apps Script summary request timed out.");
    }

    throw error;
  } finally {
    request.clear();
  }
}
