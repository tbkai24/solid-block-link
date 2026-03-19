import { FormEvent, useEffect, useState } from "react";
import { useAdminAlert } from "../../hooks/useAdminAlert";
import { supabase } from "../../lib/supabase";
import { formatCurrency } from "../../services/format";
import { addInternalDonation, fetchInternalDonations, removeInternalDonation, updateInternalDonation } from "../../services/internalDonations";
import { InternalAdjustmentRow } from "../../types/supabase";

type DonationForm = {
  name: string;
  amount: string;
  notes: string;
};

const emptyForm: DonationForm = { name: "", amount: "", notes: "" };

export function AdminInternalDonationPanel() {
  const [campaignId, setCampaignId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [total, setTotal] = useState(0);
  const [entries, setEntries] = useState<InternalAdjustmentRow[]>([]);
  const [form, setForm] = useState<DonationForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { message, tone, showAlert } = useAdminAlert();

  useEffect(() => {
    async function load() {
      if (!supabase) return setLoading(false);
      const campaignRes = await supabase.from("campaigns").select("id, internal_amount").eq("featured", true).eq("is_past", false).limit(1).maybeSingle();
      if (campaignRes.error) {
        showAlert("danger", campaignRes.error.message);
        setLoading(false);
        return;
      }
      const nextCampaignId = campaignRes.data?.id ?? "";
      setCampaignId(nextCampaignId);
      setTotal(Number(campaignRes.data?.internal_amount ?? 0));
      if (!nextCampaignId) return setLoading(false);
      try {
        setEntries(await fetchInternalDonations(nextCampaignId));
      } catch (error) {
        showAlert("danger", error instanceof Error ? error.message : "Failed to load internal donations.");
      }
      setLoading(false);
    }
    void load();
  }, [showAlert]);

  useEffect(() => {
    if (!supabase || campaignId) return;
    const client = supabase;
    const timeout = window.setTimeout(async () => {
      const campaignRes = await client
        .from("campaigns")
        .select("id, internal_amount")
        .eq("featured", true)
        .eq("is_past", false)
        .limit(1)
        .maybeSingle();
      if (!campaignRes.data?.id) return;
      setCampaignId(campaignRes.data.id);
      setTotal(Number(campaignRes.data.internal_amount ?? 0));
      try {
        setEntries(await fetchInternalDonations(campaignRes.data.id));
      } catch (error) {
        showAlert("danger", error instanceof Error ? error.message : "Failed to load internal donations.");
      }
    }, 1000);
    return () => window.clearTimeout(timeout);
  }, [campaignId, showAlert]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return showAlert("danger", "Supabase is not configured.");
    if (!campaignId) return showAlert("danger", "No active featured campaign found.");
    if (!form.name.trim()) return showAlert("warning", "Name of donor is required.");
    if (Number(form.amount || 0) <= 0) return showAlert("warning", "Amount must be greater than 0.");
    setSaving(true);
    try {
      const amount = Number(form.amount || 0);
      if (editingId) {
        const previous = entries.find((item) => item.id === editingId);
        const data = await updateInternalDonation(editingId, form.name.trim(), amount, form.notes.trim());
        setEntries((current) => current.map((item) => (item.id === editingId ? data : item)));
        setTotal((current) => Math.max(0, current - Number(previous?.amount ?? 0) + data.amount));
        showAlert("success", "Internal donation updated.");
      } else {
        const data = await addInternalDonation(campaignId, form.name.trim(), amount, form.notes.trim());
        setEntries((current) => [data, ...current].slice(0, 8));
        setTotal((current) => current + data.amount);
        showAlert("success", "Internal donation added.");
      }
      setEditingId("");
      setForm(emptyForm);
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
        setForm(emptyForm);
      }
      showAlert("success", "Internal donation removed.");
    } catch (error) {
      showAlert("danger", error instanceof Error ? error.message : "Failed to remove internal donation.");
    }
  }

  function handleEdit(item: InternalAdjustmentRow) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      amount: String(item.amount),
      notes: item.notes
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <section className="admin-panel">
      <p className="eyebrow">Internal Donation</p>
      <h2>Internal Donation</h2>
      <p className="muted-text">Track donations added outside the public sheet. These are merged into the homepage total automatically.</p>
      <p className="milestone-note">Current internal total: {formatCurrency(total)}</p>
      {message ? <p className={`admin-alert ${tone}`}>{message}</p> : null}
      <form className="admin-settings-form" onSubmit={handleSubmit}>
        <label>
          <span>Name</span>
          <input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} placeholder="Name of donor" disabled={loading || saving} />
        </label>
        <label>
          <span>Amount</span>
          <input type="number" min="0" value={form.amount} onChange={(e) => setForm((current) => ({ ...current, amount: e.target.value }))} placeholder="0" disabled={loading || saving} />
        </label>
        <label>
          <span>Notes</span>
          <textarea value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} placeholder="Optional internal note." disabled={loading || saving} />
        </label>
        <button className="lookup-button" type="submit" disabled={loading || saving}>
          {saving ? "Saving..." : editingId ? "Update Internal Donation" : "Add Internal Donation"}
        </button>
        {editingId ? (
          <button className="admin-inline-button" type="button" onClick={() => { setEditingId(""); setForm(emptyForm); }}>
            Cancel Edit
          </button>
        ) : null}
      </form>
      <div className="admin-summary-table-wrap">
        <table className="admin-summary-table">
          <thead>
            <tr>
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
                <td>{item.name}</td>
                <td>{formatCurrency(item.amount)}</td>
                <td>{item.notes || "No notes"}</td>
                <td>{new Date(item.added_at).toLocaleDateString()}</td>
                <td>
                  <div className="admin-table-actions">
                    <button className="admin-inline-button" type="button" onClick={() => handleEdit(item)}>
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
                <td colSpan={5} className="muted-text">No internal donations yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
