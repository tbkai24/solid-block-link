import { supabase } from "../lib/supabase";
import { InternalAdjustmentRow } from "../types/supabase";

type RawInternalAdjustment = {
  id: string;
  campaign_id: string;
  milestone_id?: string | null;
  name?: string;
  label?: string;
  amount: number;
  notes?: string;
  added_at: string;
};

function toInternalAdjustment(row: RawInternalAdjustment): InternalAdjustmentRow {
  return {
    id: row.id,
    campaign_id: row.campaign_id,
    milestone_id: row.milestone_id ?? null,
    name: row.name ?? row.label ?? "",
    amount: Number(row.amount ?? 0),
    notes: row.notes ?? "",
    added_at: row.added_at
  };
}

export async function fetchInternalDonations(campaignId: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase
    .from("campaign_internal_adjustments")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("added_at", { ascending: false })
    .limit(8);
  if (error) throw error;
  return ((data ?? []) as RawInternalAdjustment[]).map(toInternalAdjustment);
}

export async function addInternalDonation(campaignId: string, milestoneId: string | null, name: string, amount: number, notes: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const base = { campaign_id: campaignId, milestone_id: milestoneId, amount, notes };
  const attemptName = await supabase.from("campaign_internal_adjustments").insert({ ...base, name, label: name }).select("*").single();
  if (!attemptName.error) return toInternalAdjustment(attemptName.data as RawInternalAdjustment);
  if (attemptName.error.message.toLowerCase().includes("milestone_id")) {
    const retryWithoutMilestone = await supabase
      .from("campaign_internal_adjustments")
      .insert({ campaign_id: campaignId, amount, notes, name, label: name })
      .select("*")
      .single();
    if (!retryWithoutMilestone.error) return toInternalAdjustment(retryWithoutMilestone.data as RawInternalAdjustment);
    throw retryWithoutMilestone.error;
  }
  if (!attemptName.error.message.toLowerCase().includes("name")) throw attemptName.error;

  const attemptLabel = await supabase.from("campaign_internal_adjustments").insert({ ...base, label: name }).select("*").single();
  if (attemptLabel.error) throw attemptLabel.error;
  return toInternalAdjustment(attemptLabel.data as RawInternalAdjustment);
}

export async function removeInternalDonation(id: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.from("campaign_internal_adjustments").delete().eq("id", id);
  if (error) throw error;
}

export async function updateInternalDonation(id: string, campaignId: string, milestoneId: string | null, name: string, amount: number, notes: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const base = { campaign_id: campaignId, milestone_id: milestoneId, amount, notes };
  const attemptName = await supabase.from("campaign_internal_adjustments").update({ ...base, name, label: name }).eq("id", id).select("*").single();
  if (!attemptName.error) return toInternalAdjustment(attemptName.data as RawInternalAdjustment);
  if (attemptName.error.message.toLowerCase().includes("milestone_id")) {
    const retryWithoutMilestone = await supabase
      .from("campaign_internal_adjustments")
      .update({ campaign_id: campaignId, amount, notes, name, label: name })
      .eq("id", id)
      .select("*")
      .single();
    if (!retryWithoutMilestone.error) return toInternalAdjustment(retryWithoutMilestone.data as RawInternalAdjustment);
    throw retryWithoutMilestone.error;
  }
  if (!attemptName.error.message.toLowerCase().includes("name")) throw attemptName.error;

  const attemptLabel = await supabase.from("campaign_internal_adjustments").update({ ...base, label: name }).eq("id", id).select("*").single();
  if (attemptLabel.error) throw attemptLabel.error;
  return toInternalAdjustment(attemptLabel.data as RawInternalAdjustment);
}
