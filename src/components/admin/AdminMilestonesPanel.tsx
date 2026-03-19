import { FormEvent, useEffect, useRef, useState } from "react";
import { useAdminAlert } from "../../hooks/useAdminAlert";
import { supabase } from "../../lib/supabase";
import { getDonationSummary } from "../../services/appsScript";
import { formatCurrency } from "../../services/format";
import { fetchSiteSettings } from "../../services/siteSettings";

type MilestoneForm = {
  campaignTitle: string;
  campaignDescription: string;
  goalAmount: string;
  status: "Active" | "Completed";
};

type MilestoneSnapshot = {
  publicRaised: number;
  internalRaised: number;
  totalRaised: number;
  donorCount: number;
};

export function AdminMilestonesPanel() {
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const [campaignId, setCampaignId] = useState("");
  const [form, setForm] = useState<MilestoneForm>({
    campaignTitle: "",
    campaignDescription: "",
    goalAmount: "0",
    status: "Active"
  });
  const [snapshot, setSnapshot] = useState<MilestoneSnapshot>({
    publicRaised: 0,
    internalRaised: 0,
    totalRaised: 0,
    donorCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { message, tone, showAlert } = useAdminAlert();

  useEffect(() => {
    async function load() {
      try {
        const [, campaignRes, donationSummary] = await Promise.all([
          fetchSiteSettings(),
          supabase?.from("campaigns").select("id, title, summary, goal_amount, internal_amount, status").eq("featured", true).eq("is_past", false).limit(1).maybeSingle(),
          getDonationSummary().catch(() => null)
        ]);
        const publicRaised = donationSummary?.totalDonations ?? 0;
        const internalRaised = Number(campaignRes?.data?.internal_amount ?? 0);
        setCampaignId(campaignRes?.data?.id ?? "");
        setForm({
          campaignTitle: campaignRes?.data?.title ?? "",
          campaignDescription: campaignRes?.data?.summary ?? "",
          goalAmount: String(campaignRes?.data?.goal_amount ?? 0),
          status: campaignRes?.data?.status ?? "Active"
        });
        setSnapshot({
          publicRaised,
          internalRaised,
          totalRaised: publicRaised + internalRaised,
          donorCount: donationSummary?.donorCount ?? 0
        });
      } catch (error) {
        showAlert("danger", error instanceof Error ? error.message : "Failed to load milestone settings.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [showAlert]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return showAlert("danger", "Supabase is not configured.");
    if (!form.campaignTitle.trim()) {
      return showAlert("warning", "Active campaign title is required.");
    }
    if (Number(form.goalAmount || 0) < 0) {
      return showAlert("warning", "Goal must be 0 or higher.");
    }
    setSaving(true);
    try {
      const nextCampaignId =
        campaignId ||
        (
          await supabase
            .from("campaigns")
            .select("id")
            .eq("featured", true)
            .eq("is_past", false)
            .limit(1)
            .maybeSingle()
        ).data?.id ||
        "";
      if (nextCampaignId) {
        const { error } = await supabase
          .from("campaigns")
          .update({
            title: form.campaignTitle.trim(),
            summary: form.campaignDescription.trim(),
            goal_amount: Number(form.goalAmount || 0),
            status: form.status
          })
          .eq("id", nextCampaignId);
        if (error) throw error;
        setCampaignId(nextCampaignId);
      } else {
        const { data, error } = await supabase
          .from("campaigns")
          .insert({
            title: form.campaignTitle.trim(),
            summary: form.campaignDescription.trim(),
            status: form.status,
            outcome: "",
            goal_amount: Number(form.goalAmount || 0),
            featured: true,
            is_past: false
          })
          .select("id")
          .single();
        if (error) throw error;
        setCampaignId(data.id);
      }
      setSnapshot((current) => ({ ...current }));
      showAlert("success", "Milestone saved.");
    } catch (error) {
      showAlert("danger", error instanceof Error ? error.message : "Milestone save failed.");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit() {
    titleInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    titleInputRef.current?.focus();
  }

  async function handleDelete() {
    if (!supabase) return showAlert("danger", "Supabase is not configured.");
    if (!campaignId) return showAlert("warning", "No active milestone entry to delete.");
    const confirmed = window.confirm("Delete this milestone entry?");
    if (!confirmed) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("campaigns")
        .update({ title: "", summary: "", goal_amount: 0, status: "Active" })
        .eq("id", campaignId);
      if (error) throw error;
      setForm({ campaignTitle: "", campaignDescription: "", goalAmount: "0", status: "Active" });
      showAlert("success", "Milestone cleared.");
    } catch (error) {
      showAlert("danger", error instanceof Error ? error.message : "Delete milestone failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-panel">
      <p className="eyebrow">Milestone</p>
      <h2>Milestone</h2>
      <p className="muted-text">Set the active campaign title and public goal shown on the homepage.</p>
      {message ? <p className={`admin-alert ${tone}`}>{message}</p> : null}
      <form className="admin-settings-form" onSubmit={handleSubmit}>
        <label>
          <span>Active Campaign Title</span>
          <input ref={titleInputRef} value={form.campaignTitle} onChange={(e) => setForm((current) => ({ ...current, campaignTitle: e.target.value }))} placeholder="Worldwide Promo Push" disabled={loading} />
        </label>
        <label>
          <span>Campaign Description</span>
          <textarea
            value={form.campaignDescription}
            onChange={(e) => setForm((current) => ({ ...current, campaignDescription: e.target.value }))}
            placeholder="Short description shown below the campaign title."
            disabled={loading}
          />
        </label>
        <label>
          <span>Goal</span>
          <input type="number" min="0" value={form.goalAmount} onChange={(e) => setForm((current) => ({ ...current, goalAmount: e.target.value }))} placeholder="0" disabled={loading} />
        </label>
        <label>
          <span>Status</span>
          <select value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value as MilestoneForm["status"] }))} disabled={loading}>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
          </select>
        </label>
        <button className="lookup-button" type="submit" disabled={loading || saving}>
          {saving ? "Saving..." : campaignId ? "Update Milestone" : "Save Milestone"}
        </button>
      </form>
      <div className="admin-summary-table-wrap">
        <table className="admin-summary-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Description</th>
              <th>Goal</th>
              <th>Total Raised</th>
              <th>Progress</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{form.campaignTitle || "Not set"}</td>
              <td>{form.campaignDescription || "Not set"}</td>
              <td>{formatCurrency(Number(form.goalAmount || 0))}</td>
              <td>{formatCurrency(snapshot.totalRaised)}</td>
              <td>
                {Number(form.goalAmount || 0) > 0
                  ? `${Math.min(Math.round((snapshot.totalRaised / Number(form.goalAmount || 0)) * 100), 100)}%`
                  : "0%"}
              </td>
              <td>{form.status}</td>
              <td>
                <div className="admin-table-actions">
                  <button className="admin-inline-button" type="button" onClick={handleEdit}>
                    Edit
                  </button>
                  <button className="admin-inline-button danger" type="button" onClick={() => void handleDelete()} disabled={saving}>
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
