const platformMatchers: Array<{ label: string; match: RegExp }> = [
  { label: "Facebook", match: /facebook\.com|fb\.watch/i },
  { label: "Instagram", match: /instagram\.com/i },
  { label: "Threads", match: /threads\.net/i },
  { label: "X", match: /x\.com|twitter\.com/i },
  { label: "TikTok", match: /tiktok\.com/i }
];

function formatDateLabel(value: string) {
  if (!value) return "Today";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Today" : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function inferPostType(url: string) {
  const lower = url.toLowerCase();
  if (lower.includes("/reel/")) return "Reel";
  if (lower.includes("/video/")) return "Video";
  if (lower.includes("/status/")) return "Post";
  if (lower.includes("/posts/")) return "Post";
  if (lower.includes("/photo/")) return "Photo Post";
  return "Update";
}

export function detectPlatformFromUrl(url: string) {
  const match = platformMatchers.find((item) => item.match.test(url));
  return match?.label ?? null;
}

export function suggestUpdateTitle(input: {
  url: string;
  platform: string;
  label: string;
  publishedAt: string;
}) {
  const platform = detectPlatformFromUrl(input.url) || input.platform || "Social";
  const postType = inferPostType(input.url);
  const dateLabel = formatDateLabel(input.publishedAt);
  const labelPrefix = input.label === "Past Campaign" ? "Past Campaign" : "Latest Update";
  return `${labelPrefix}: ${platform} ${postType} - ${dateLabel}`;
}

export function suggestUpdateSummary(input: {
  platform: string;
  label: string;
}) {
  const platform = input.platform || "social";
  if (input.label === "Past Campaign") {
    return `Archived ${platform} post captured as part of Solid Block Link's campaign history.`;
  }

  return `Selected ${platform} update highlighted for the current Solid Block Link campaign.`;
}
