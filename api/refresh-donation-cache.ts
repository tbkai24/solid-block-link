import {
  fetchAppsScriptSummary,
  getSupabase,
  markDonationSnapshotError,
  upsertDonationSnapshot
} from "./_lib/donationSnapshots.js";

function getBearerToken(req: any) {
  const header = String(req.headers?.authorization || "");
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method not allowed." });
  }

  const reqUrl = new URL(req.url || "", "https://localhost");
  const forceParam = reqUrl.searchParams.get("force") === "true";
  const querySecret = reqUrl.searchParams.get("secret") || "";
  const cronSecret = String(process.env.CRON_SECRET || "").trim();
  const requestSecret = getBearerToken(req) || String(req.headers?.["x-cron-secret"] || querySecret || "").trim();

  if (cronSecret && requestSecret !== cronSecret && !forceParam) {
    return res.status(401).json({ ok: false, message: "Unauthorized refresh request." });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return res.status(500).json({ ok: false, message: "Supabase is not configured." });
  }

  const campaignsRes = await supabase
    .from("campaigns")
    .select("id, title, sheet_name")
    .not("sheet_name", "is", null)
    .neq("sheet_name", "")
    .order("featured", { ascending: false })
    .order("homepage_order", { ascending: true })
    .order("last_updated", { ascending: false })
    .limit(24);

  if (campaignsRes.error) {
    return res.status(500).json({ ok: false, message: campaignsRes.error.message });
  }

  const campaigns = campaignsRes.data ?? [];
  const milestoneRes = campaigns.length
    ? await supabase
        .from("campaign_milestones")
        .select("id, campaign_id, title, row_start, row_end")
        .in("campaign_id", campaigns.map((campaign: any) => campaign.id))
        .order("display_order", { ascending: true })
    : { data: [], error: null };

  if (milestoneRes.error) {
    return res.status(500).json({ ok: false, message: milestoneRes.error.message });
  }

  const rows = milestoneRes.data ?? [];
  const results = await Promise.all(campaigns.map(async (campaign: any) => {
    const milestones = rows
      .filter((row: any) => row.campaign_id === campaign.id)
      .map((row: any) => ({
        milestoneId: row.id,
        title: row.title,
        rowStart: Number(row.row_start ?? 0),
        rowEnd: Number(row.row_end ?? 0)
      }));

    try {
      const summary = await fetchAppsScriptSummary(milestones, String(campaign.sheet_name ?? ""), 25000);
      if (!summary) throw new Error("Apps Script URL is not configured.");
      await upsertDonationSnapshot(campaign.id, summary);

      return {
        campaignId: campaign.id,
        title: campaign.title,
        ok: true
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Donation cache refresh failed.";
      await markDonationSnapshotError(campaign.id, message);

      return {
        campaignId: campaign.id,
        title: campaign.title,
        ok: false,
        message
      };
    }
  }));

  return res.status(200).json({
    ok: true,
    refreshedAt: new Date().toISOString(),
    results
  });
}
