import { createClient } from "@supabase/supabase-js";
import { getCachedDonationSummary } from "./_lib/donationSnapshots.js";
import { getEnv } from "./_lib/env.js";
function getSupabase() {
    const supabaseUrl = getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL") || "";
    const supabaseServerKey = getEnv("SUPABASE_SERVICE_ROLE_KEY") ||
        getEnv("SUPABASE_ANON_KEY") ||
        getEnv("VITE_SUPABASE_ANON_KEY") ||
        "";
    if (!supabaseUrl || !supabaseServerKey)
        return null;
    return createClient(supabaseUrl, supabaseServerKey);
}
function getAppsScriptUrl() {
    return (getEnv("VITE_APPS_SCRIPT_URL") || getEnv("APPS_SCRIPT_URL") || "").trim();
}
const APPS_SCRIPT_TIMEOUT_MS = 4500;
const DEFAULT_FOOTER_TITLE = "Connect with Solid Block Link";
const DEFAULT_FOOTER_SUMMARY = "Fan-powered marketing and donation campaigns helping promote SB19 worldwide.";
function getCombinedMilestoneTarget(rows) {
    return (rows ?? []).reduce((sum, item) => sum + Number(item?.target_amount ?? 0), 0);
}
function getSummaryPublicRaised(summary) {
    const topLevelTotal = Number(summary?.totalDonations ?? 0);
    if (topLevelTotal > 0)
        return topLevelTotal;
    return (summary?.milestones ?? []).reduce((sum, item) => sum + Number(item?.totalDonations ?? 0), 0);
}
function getSummaryPublicDonors(summary) {
    const topLevelEntries = Number(summary?.donationEntries ?? 0);
    const topLevelDonors = Number(summary?.donorCount ?? 0);
    if (topLevelEntries > 0)
        return topLevelEntries;
    if (topLevelDonors > 0)
        return topLevelDonors;
    return (summary?.milestones ?? []).reduce((sum, item) => sum + Number(item?.donationEntries ?? item?.donorCount ?? 0), 0);
}
async function getDonationSummaryWithMilestones(milestones = [], sheetName = "") {
    const appsScriptUrl = getAppsScriptUrl();
    if (!appsScriptUrl)
        return null;
    const query = new URLSearchParams({ action: "summary" });
    if (milestones.length) {
        query.set("milestones", JSON.stringify(milestones));
    }
    if (sheetName.trim()) {
        query.set("sheetName", sheetName.trim());
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), APPS_SCRIPT_TIMEOUT_MS);
    const response = await fetch(`${appsScriptUrl}?${query.toString()}`, {
        signal: controller.signal
    }).finally(() => clearTimeout(timeoutId));
    const data = (await response.json());
    if (!response.ok || !data?.ok) {
        throw new Error(data?.message || "Apps Script summary fetch failed.");
    }
    return data;
}
function createTargetMap(rows = []) {
    return (rows ?? []).reduce((acc, item) => {
        const campaignId = String(item?.campaign_id ?? "");
        if (!campaignId)
            return acc;
        acc[campaignId] = (acc[campaignId] ?? 0) + Number(item?.target_amount ?? 0);
        return acc;
    }, {});
}
function createCountMap(rows = []) {
    return (rows ?? []).reduce((acc, item) => {
        const campaignId = String(item?.campaign_id ?? "");
        if (!campaignId)
            return acc;
        acc[campaignId] = (acc[campaignId] ?? 0) + 1;
        return acc;
    }, {});
}
function createInternalMilestoneMap(rows) {
    return (rows ?? []).reduce((acc, item) => {
        if (!item?.milestone_id)
            return acc;
        const current = acc[item.milestone_id] ?? { amount: 0, donorCount: 0 };
        acc[item.milestone_id] = {
            amount: current.amount + Number(item.amount ?? 0),
            donorCount: current.donorCount + 1
        };
        return acc;
    }, {});
}
async function fetchInternalDonorCounts(campaignIds) {
    const counts = {};
    const supabase = getSupabase();
    if (!supabase || !campaignIds.length)
        return counts;
    const rpcRes = await supabase.rpc("get_internal_donor_counts", {
        campaign_ids: campaignIds
    });
    if (!rpcRes.error) {
        (rpcRes.data ?? []).forEach((item) => {
            const campaignId = String(item?.campaign_id ?? "");
            if (campaignId)
                counts[campaignId] = Number(item?.donor_count ?? 0);
        });
        return counts;
    }
    const fallbackRes = await supabase
        .from("campaign_internal_adjustments")
        .select("campaign_id")
        .in("campaign_id", campaignIds);
    return createCountMap(fallbackRes.data ?? []);
}
async function fetchInternalAdjustmentRowsForCampaigns(campaignIds) {
    const supabase = getSupabase();
    if (!supabase || !campaignIds.length)
        return [];
    const primary = await supabase
        .from("campaign_internal_adjustments")
        .select("id, campaign_id, milestone_id, name, amount, notes, added_at")
        .in("campaign_id", campaignIds);
    if (!primary.error) {
        return primary.data ?? [];
    }
    const fallback = await supabase
        .from("campaign_internal_adjustments")
        .select("id, campaign_id, label, amount, notes, added_at")
        .in("campaign_id", campaignIds);
    if (fallback.error)
        return [];
    return (fallback.data ?? []).map((item) => ({
        id: String(item.id),
        campaign_id: String(item.campaign_id),
        milestone_id: null,
        name: String(item.label ?? ""),
        amount: Number(item.amount ?? 0),
        notes: String(item.notes ?? ""),
        added_at: String(item.added_at ?? "")
    }));
}
function createEmptyContent() {
    return {
        logoUrl: "",
        heroTitle: "",
        heroSummary: "",
        donateCta: { label: "Donate Now", href: "#" },
        lookupCta: { label: "SBL Donation Lookup", href: "/lookup" },
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
            title: DEFAULT_FOOTER_TITLE,
            summary: DEFAULT_FOOTER_SUMMARY
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
            outcome: "",
            sheetName: "",
            homepageOrder: 0
        },
        homepageCampaigns: [],
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
function toShellCampaignMilestones(rows = [], summary = null, internalRows = [], fallbackCampaign = null) {
    const milestoneSummaryMap = new Map((summary?.milestones ?? []).map((item) => [item.milestoneId, item]));
    const internalMilestoneMap = createInternalMilestoneMap(internalRows);
    const campaignPublicRaised = getSummaryPublicRaised(summary) || Number(fallbackCampaign?.public_amount ?? 0);
    const campaignPublicDonors = getSummaryPublicDonors(summary) || Number(fallbackCampaign?.donor_count ?? 0);
    const unassignedInternal = (internalRows ?? []).filter((item) => !item?.milestone_id);
    const unassignedInternalAmount = unassignedInternal.reduce((sum, item) => sum + Number(item?.amount ?? 0), 0);
    const unassignedInternalDonors = unassignedInternal.length;
    const totalMilestonesPublicRaised = (summary?.milestones ?? []).reduce((sum, item) => sum + Number(item?.totalDonations ?? 0), 0);
    const hasSpecificPublicBreakdown = milestoneSummaryMap.size > 0 && totalMilestonesPublicRaised > 0;
    const activeIndex = (rows ?? []).findIndex((r) => {
        const s = String(r?.status ?? "").toLowerCase();
        return s === "active" || s === "ongoing";
    });
    const primaryIndex = activeIndex >= 0 ? activeIndex : 0;
    return (rows ?? []).map((item, index) => {
        const milestoneSummary = milestoneSummaryMap.get(item.id);
        const internalMilestone = internalMilestoneMap[item.id];
        let publicRaised = Number(milestoneSummary?.totalDonations ?? 0);
        let publicDonors = Number(milestoneSummary?.donationEntries ?? milestoneSummary?.donorCount ?? 0);
        let internalRaised = Number(internalMilestone?.amount ?? 0);
        let internalDonors = Number(internalMilestone?.donorCount ?? 0);
        const isPrimaryMilestone = index === primaryIndex;
        if (rows.length === 1 || (!hasSpecificPublicBreakdown && isPrimaryMilestone)) {
            if (publicRaised === 0 && campaignPublicRaised > 0) {
                publicRaised = campaignPublicRaised;
            }
            if (publicDonors === 0 && campaignPublicDonors > 0) {
                publicDonors = campaignPublicDonors;
            }
        }
        if (unassignedInternalAmount > 0 && (rows.length === 1 || isPrimaryMilestone)) {
            internalRaised += unassignedInternalAmount;
            internalDonors += unassignedInternalDonors;
        }
        const raisedAmount = publicRaised + internalRaised;
        const donorCount = publicDonors + internalDonors;
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
function toHomepageCampaign(campaign, milestoneRows = [], summary = null) {
    const progress = toShellProgress(campaign, milestoneRows, summary);
    return {
        id: campaign?.id ?? "",
        title: campaign?.title ?? "",
        status: campaign?.status ?? "Active",
        summary: campaign?.summary ?? "",
        outcome: campaign?.outcome ?? "",
        donateUrl: campaign?.donate_url ?? "",
        sheetName: campaign?.sheet_name ?? "",
        homepageOrder: Number(campaign?.homepage_order ?? 0),
        goalAmount: Number(campaign?.goal_amount ?? 0),
        publicAmount: Number(campaign?.public_amount ?? 0),
        internalAmount: Number(campaign?.internal_amount ?? 0),
        donorCount: Number(campaign?.donor_count ?? 0),
        internalDonorCount: 0,
        progress,
        milestone: toShellMilestone(progress.totalRaised),
        campaignMilestones: toShellCampaignMilestones(milestoneRows, summary, [], campaign),
        milestoneCount: milestoneRows.length
    };
}
function toShellProgress(campaign, milestoneRows = [], summary = null) {
    const publicRaised = summary ? getSummaryPublicRaised(summary) : Number(campaign?.public_amount ?? 0);
    const internalRaised = Number(campaign?.internal_amount ?? 0);
    const totalRaised = publicRaised + internalRaised;
    const goal = getCombinedMilestoneTarget(milestoneRows) || Number(campaign?.goal_amount ?? 0);
    const percent = goal > 0
        ? Math.min(Math.round(((totalRaised / goal) * 100) * 100) / 100, 100)
        : 0;
    return {
        totalRaised,
        publicRaised,
        donorCount: summary ? getSummaryPublicDonors(summary) : Number(campaign?.donor_count ?? 0),
        internalDonorCount: 0,
        goal,
        internalRaised,
        percent,
        lastUpdated: campaign?.last_updated ?? ""
    };
}
function toShellMilestone(totalRaised) {
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
export default async function handler(_req, res) {
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=1800");
    res.setHeader("CDN-Cache-Control", "public, s-maxage=300, stale-while-revalidate=1800");
    res.setHeader("Vercel-CDN-Cache-Control", "public, s-maxage=300, stale-while-revalidate=1800");
    try {
        const base = createEmptyContent();
        const supabase = getSupabase();
        if (!supabase) {
            return res.status(200).json(base);
        }
        const [campaignsRes, updatesRes, embedsRes, pastRes] = await Promise.all([
            supabase.from("campaigns").select("*").eq("featured", true).eq("is_past", false).eq("status", "Active").order("homepage_order", { ascending: true }).order("last_updated", { ascending: false }).limit(4),
            supabase.from("updates").select("*").order("published_at", { ascending: false }).limit(8),
            supabase.from("embeds").select("*").eq("featured", true).order("display_order", { ascending: true }).limit(4),
            supabase.from("campaigns").select("*").order("last_updated", { ascending: false }).limit(24)
        ]);
        const featuredCampaigns = campaignsRes.data ?? [];
        const archiveCampaigns = pastRes.data ?? [];
        const currentCampaignRow = featuredCampaigns[0] ?? null;
        const milestoneRes = featuredCampaigns.length
            ? await supabase.from("campaign_milestones").select("*").in("campaign_id", featuredCampaigns.map((item) => item.id)).order("display_order", { ascending: true })
            : { data: [], error: null };
        const archiveMilestoneRes = archiveCampaigns.length
            ? await supabase.from("campaign_milestones").select("*").in("campaign_id", archiveCampaigns.map((item) => item.id)).order("display_order", { ascending: true })
            : { data: [], error: null };
        const allMilestoneRows = milestoneRes.data ?? [];
        const archiveTargetByCampaign = createTargetMap(archiveMilestoneRes.data ?? []);
        const archiveInternalDonorsByCampaign = await fetchInternalDonorCounts(archiveCampaigns.map((item) => item.id));
        const archiveInternalRows = await fetchInternalAdjustmentRowsForCampaigns(archiveCampaigns.map((item) => item.id));
        const archiveSummaryByCampaign = new Map();
        await Promise.all(archiveCampaigns.map(async (archiveCampaign) => {
            archiveSummaryByCampaign.set(archiveCampaign.id, await getCachedDonationSummary(archiveCampaign.id));
        }));
        const currentMilestoneRows = currentCampaignRow
            ? allMilestoneRows.filter((item) => item.campaign_id === currentCampaignRow.id)
            : [];
        const summaryByCampaign = new Map();
        await Promise.all(featuredCampaigns.map(async (campaign) => {
            summaryByCampaign.set(campaign.id, await getCachedDonationSummary(campaign.id));
        }));
        const currentSummary = currentCampaignRow ? summaryByCampaign.get(currentCampaignRow.id) : null;
        const progress = toShellProgress(currentCampaignRow, currentMilestoneRows, currentSummary);
        return res.status(200).json({
            ...base,
            milestone: toShellMilestone(progress.totalRaised),
            campaignMilestones: toShellCampaignMilestones(currentMilestoneRows, currentSummary),
            currentCampaign: {
                id: currentCampaignRow?.id ?? "",
                title: currentCampaignRow?.title ?? "",
                status: currentCampaignRow?.status ?? "Active",
                summary: currentCampaignRow?.summary ?? "",
                outcome: currentCampaignRow?.outcome ?? "",
                donateUrl: currentCampaignRow?.donate_url ?? "",
                sheetName: currentCampaignRow?.sheet_name ?? "",
                homepageOrder: Number(currentCampaignRow?.homepage_order ?? 0),
                goalAmount: Number(currentCampaignRow?.goal_amount ?? 0),
                publicAmount: Number(currentCampaignRow?.public_amount ?? 0),
                internalAmount: Number(currentCampaignRow?.internal_amount ?? 0),
                donorCount: Number(currentCampaignRow?.donor_count ?? 0),
                internalDonorCount: 0
            },
            homepageCampaigns: featuredCampaigns.map((campaign) => {
                const rows = allMilestoneRows.filter((item) => item.campaign_id === campaign.id);
                return toHomepageCampaign(campaign, rows, summaryByCampaign.get(campaign.id));
            }),
            progress,
            updates: (Array.isArray(updatesRes.data) ? updatesRes.data : []).map((item) => ({
                id: item.id,
                title: item.title,
                summary: item.summary,
                label: item.content_label,
                category: item.update_category || item.content_label,
                platform: item.platform,
                date: new Date(item.published_at).toLocaleDateString(),
                href: item.href,
                featured: item.featured,
                popupEnabled: Boolean(item.show_as_popup),
                popupImageUrl: item.popup_image_url ?? "",
                popupFrequency: item.popup_frequency ?? "once",
                popupExpiresAt: item.popup_expires_at ?? ""
            })),
            embeds: (Array.isArray(embedsRes.data) ? embedsRes.data : []).map((item) => ({
                id: item.id,
                title: item.title,
                platform: item.platform,
                embedNote: item.embed_note
            })),
            pastCampaigns: archiveCampaigns.map((item) => {
                const liveSummary = archiveSummaryByCampaign.get(item.id) ?? null;
                const rows = (archiveMilestoneRes.data ?? []).filter((row) => row.campaign_id === item.id);
                const internalRows = archiveInternalRows.filter((row) => row.campaign_id === item.id);
                return {
                    id: item.id,
                    title: item.title,
                    status: item.status,
                    summary: item.summary,
                    outcome: item.outcome,
                    goalAmount: archiveTargetByCampaign[item.id] || Number(item.goal_amount ?? 0),
                    publicAmount: liveSummary ? getSummaryPublicRaised(liveSummary) : Number(item.public_amount ?? 0),
                    internalAmount: Number(item.internal_amount ?? 0),
                    donorCount: liveSummary ? getSummaryPublicDonors(liveSummary) : Number(item.donor_count ?? 0),
                    internalDonorCount: archiveInternalDonorsByCampaign[item.id] ?? 0,
                    campaignMilestones: toShellCampaignMilestones(rows, liveSummary, internalRows),
                    milestoneCount: rows.length
                };
            })
        });
    }
    catch (error) {
        return res.status(500).json({
            ok: false,
            message: error instanceof Error ? error.message : "Unable to load site shell."
        });
    }
}
