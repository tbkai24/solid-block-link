import { FormEvent, useEffect, useState } from "react";
import { useAdminAlert } from "../../hooks/useAdminAlert";
import { supabase } from "../../lib/supabase";
import { formatCurrency } from "../../services/format";
import { addInternalDonation, fetchInternalDonations, removeInternalDonation, updateInternalDonation } from "../../services/internalDonations";
import { invalidateSiteContentCache } from "../../services/siteContentCache";
import { CampaignMilestoneRow, InternalAdjustmentRow } from "../../types/supabase";

type DonationForm = {
  campaignId: string;
  milestoneId: string;
  name: string;
  amount: string;
  notes: string;
};

type CampaignOption = {
  id: string;
  title: string;
};

const emptyForm: DonationForm = {
  campaignId: "",
  milestoneId: "",
  name: "",
  amount: "",
  notes: ""
};

export function AdminInternalDonationPanel() {
  const [campaignId, setCampaignId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [total, setTotal] = useState(0);
  const [entries, setEntries] = useState<InternalAdjustmentRow[]>([]);
  const [campaignOptions, setCampaignOptions] = useState<CampaignOption[]>([]);
  const [milestoneOptions, setMilestoneOptions] = useState<CampaignMilestoneRow[]>([]);
  const [milestoneLookup, setMilestoneLookup] = useState<Record<string, string>>({});
  const [form, setForm] = useState<DonationForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { message, tone, showAlert } = useAdminAlert();

  async function loadCampaignOptions(preferredCampaignId = "") {
    if (!supabase) {
      setCampaignOptions([]);
      return [];
    }

    const { data, error } = await supabase
      .from("campaigns")
      .select("id, title")
      .order("featured", { ascending: false })
      .order("last_updated", { ascending: false });

    if (error) throw error;

    const nextOptions = (data ?? []).map((item) => ({
      id: item.id as string,
      title: (item.title as string) || "Untitled campaign"
    }));

    setCampaignOptions(nextOptions);
    setForm((current) => ({
      ...current,
      campaignId: current.campaignId || preferredCampaignId || nextOptions[0]?.id || ""
    }));

    return nextOptions;
  }

  async function loadMilestones(nextCampaignId: string) {
    if (!supabase || !nextCampaignId) {
      setMilestoneOptions([]);
      return [];
    }

    const { data, error } = await supabase
      .from("campaign_milestones")
      .select("*")
      .eq("campaign_id", nextCampaignId)
      .order("display_order", { ascending: true })
      .returns<CampaignMilestoneRow[]>();

    if (error) throw error;

    const nextMilestones = data ?? [];
    setMilestoneOptions(nextMilestones);
    setMilestoneLookup((current) => ({
      ...current,
      ...Object.fromEntries(nextMilestones.map((item) => [item.id, item.title]))
    }));

    return nextMilestones;
  }

  async function loadEntries(nextCampaignId: string) {
    if (!nextCampaignId) {
      setEntries([]);
      return;
    }

    setEntries(await fetchInternalDonations(nextCampaignId));
  }

  useEffect(() => {
    async function load() {
      if (!supabase) {
        setLoading(false);
        return;
      }

      try {
        const campaignRes = await supabase
          .from("campaigns")
          .select("id, internal_amount")
          .eq("featured", true)
          .eq("is_past", false)
          .limit(1)
          .maybeSingle();

        if (campaignRes.error) throw campaignRes.error;

        const nextCampaignId = campaignRes.data?.id ?? "";
        setCampaignId(nextCampaignId);
        setTotal(Number(campaignRes.data?.internal_amount ?? 0));
        await loadCampaignOptions(nextCampaignId);
        await loadMilestones(nextCampaignId);
        await loadEntries(nextCampaignId);
        setForm((current) => ({ ...current, campaignId: nextCampaignId || current.campaignId }));
      } catch (error) {
        showAlert("danger", error instanceof Error ? error.message : "Failed to load internal donations.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [showAlert]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return showAlert("danger", "Supabase is not configured.");
    if (!form.campaignId) return showAlert("danger", "Select a campaign first.");
    if (!form.name.trim()) return showAlert("warning", "Name of donor is required.");
    if (Number(form.amount || 0) <= 0) return showAlert("warning", "Amount must be greater than 0.");

    setSaving(true);
    try {
      const amount = Number(form.amount || 0);

      if (editingId) {
        const previous = entries.find((item) => item.id === editingId);
        const data = await updateInternalDonation(
          editingId,
          form.campaignId,
          form.milestoneId || null,
          form.name.trim(),
          amount,
          form.notes.trim()
        );

        if (form.campaignId === campaignId) {
          setEntries((current) => current.map((item) => (item.id === editingId ? data : item)));
          setTotal((current) => Math.max(0, current - Number(previous?.amount ?? 0) + data.amount));
        } else {
          await loadEntries(campaignId);
        }

        invalidateSiteContentCache();
        showAlert("success", "Internal donation updated.");
      } else {
        const data = await addInternalDonation(
          form.campaignId,
          form.milestoneId || null,
          form.name.trim(),
          amount,
          form.notes.trim()
        );

        if (form.campaignId === campaignId) {
          setEntries((current) => [data, ...current].slice(0, 8));
          setTotal((current) => current + data.amount);
        }

        invalidateSiteContentCache();
        showAlert("success", "Internal donation added.");
      }

      setEditingId("");
      setForm((current) => ({
        ...emptyForm,
        campaignId: current.campaignId
      }));
      await loadMilestones(form.campaignId);
    } catch (error) {
      showAlert("danger", error instanceof Error ? error.message : "Failed to save internal donation.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, amount: number) {
    try {
      const confirmed = window.confirm("Delete this internal donation?");
      if (!confirmed) return;

      await removeInternalDonation(id);
      setEntries((current) => current.filter((item) => item.id !== id));
      setTotal((current) => Math.max(0, current - amount));

      if (editingId === id) {
        setEditingId("");
        setForm((current) => ({
          ...emptyForm,
          campaignId: current.campaignId
        }));
      }

      invalidateSiteContentCache();
      showAlert("success", "Internal donation removed.");
    } catch (error) {
      showAlert("danger", error instanceof Error ? error.message : "Failed to remove internal donation.");
    }
  }

  async function handleEdit(item: InternalAdjustmentRow) {
    setEditingId(item.id);
    setForm({
      campaignId: item.campaign_id,
      milestoneId: item.milestone_id ?? "",
      name: item.name,
      amount: String(item.amount),
      notes: item.notes
    });
    await loadMilestones(item.campaign_id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <section className="admin-panel">
      <p className="eyebrow">Internal Donation</p>
      <h2>Internal Donation</h2>
      <p className="muted-text">Track donations added outside the public sheet, including which campaign and milestone they belong to.</p>
      <p className="milestone-note">Current internal total: {formatCurrency(total)}</p>
      {message ? <p className={`admin-alert ${tone}`}>{message}</p> : null}

      <form className="admin-settings-form" onSubmit={handleSubmit}>
        <label>
          <span>Campaign</span>
          <select
            value={form.campaignId}
            onChange={(e) => {
              const nextCampaignId = e.target.value;
              setForm((current) => ({ ...current, campaignId: nextCampaignId, milestoneId: "" }));
              void loadMilestones(nextCampaignId);
            }}
            disabled={saving}
          >
            <option value="">Select campaign</option>
            {campaignOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Milestone</span>
          <select
            value={form.milestoneId}
            onChange={(e) => setForm((current) => ({ ...current, milestoneId: e.target.value }))}
            disabled={saving || !form.campaignId}
          >
            <option value="">No milestone tag</option>
            {milestoneOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Name</span>
          <input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} placeholder="Name of donor" disabled={saving} />
        </label>
        <label>
          <span>Amount</span>
          <input type="number" min="0" value={form.amount} onChange={(e) => setForm((current) => ({ ...current, amount: e.target.value }))} placeholder="0" disabled={saving} />
        </label>
        <label>
          <span>Notes</span>
          <textarea value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} placeholder="Optional internal note." disabled={saving} />
        </label>
        <button className="lookup-button" type="submit" disabled={saving}>
          {saving ? "Saving..." : editingId ? "Update Internal Donation" : "Add Internal Donation"}
        </button>
        {editingId ? (
          <button
            className="admin-inline-button"
            type="button"
            onClick={() => {
              setEditingId("");
              setForm((current) => ({
                ...emptyForm,
                campaignId: current.campaignId
              }));
            }}
          >
            Cancel Edit
          </button>
        ) : null}
      </form>

      <div className="admin-summary-table-wrap">
        <table className="admin-summary-table">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Milestone</th>
              <th>Name</th>
              <th>Amount</th>
              <th>Notes</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((item) => (
              <tr key={item.id}>
                <td>{campaignOptions.find((option) => option.id === item.campaign_id)?.title ?? "Campaign"}</td>
                <td>{item.milestone_id ? (milestoneLookup[item.milestone_id] ?? "Tagged milestone") : "Not tagged"}</td>
                <td>{item.name}</td>
                <td>{formatCurrency(item.amount)}</td>
                <td>{item.notes || "No notes"}</td>
                <td>{new Date(item.added_at).toLocaleDateString()}</td>
                <td>
                  <div className="admin-table-actions">
                    <button className="admin-inline-button" type="button" onClick={() => void handleEdit(item)}>
                      Edit
                    </button>
                    <button className="admin-inline-button" type="button" onClick={() => void handleDelete(item.id, item.amount)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!entries.length && !loading ? (
              <tr>
                <td colSpan={7} className="muted-text">No internal donations yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
