import { FormEvent, useEffect, useRef, useState } from "react";
import { useAdminAlert } from "../../hooks/useAdminAlert";
import { supabase } from "../../lib/supabase";
import { getDonationSummary } from "../../services/appsScript";
import { formatCurrency } from "../../services/format";
import { invalidateSiteContentCache } from "../../services/siteContentCache";
import { CampaignMilestoneRow } from "../../types/supabase";

type MilestoneForm = {
  campaignTitle: string;
  campaignDescription: string;
  status: "Active" | "Completed";
};

type MilestoneRowForm = {
  campaignId: string;
  title: string;
  targetAmount: string;
  rowStart: string;
  rowEnd: string;
  displayOrder: string;
  status: "Active" | "Completed";
  note: string;
};

type MilestoneSnapshot = {
  publicRaised: number;
  internalRaised: number;
  totalRaised: number;
  donorCount: number;
};

type CampaignOption = {
  id: string;
  title: string;
};

function getMilestoneTargetTotal(rows: CampaignMilestoneRow[]) {
  return rows.reduce((sum, row) => sum + Number(row.target_amount || 0), 0);
}

export function AdminMilestonesPanel() {
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const rowTitleInputRef = useRef<HTMLInputElement | null>(null);
  const [campaignId, setCampaignId] = useState("");
  const [form, setForm] = useState<MilestoneForm>({
    campaignTitle: "",
    campaignDescription: "",
    status: "Active"
  });
  const [rowForm, setRowForm] = useState<MilestoneRowForm>({
    campaignId: "",
    title: "",
    targetAmount: "",
    rowStart: "",
    rowEnd: "",
    displayOrder: "1",
    status: "Active",
    note: ""
  });
  const [campaignOptions, setCampaignOptions] = useState<CampaignOption[]>([]);
  const [milestoneRows, setMilestoneRows] = useState<CampaignMilestoneRow[]>([]);
  const [editingRowId, setEditingRowId] = useState("");
  const [snapshot, setSnapshot] = useState<MilestoneSnapshot>({
    publicRaised: 0,
    internalRaised: 0,
    totalRaised: 0,
    donorCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rowSaving, setRowSaving] = useState(false);
  const { message: campaignMessage, tone: campaignTone, showAlert: showCampaignAlert } = useAdminAlert();
  const { message: rowMessage, tone: rowTone, showAlert: showRowAlert } = useAdminAlert();

  function toMilestoneErrorMessage(error: unknown) {
    if (!(error instanceof Error)) return "Campaign milestone save failed.";

    const message = error.message || "";
    if (message.includes("campaign_milestones")) {
      return "Campaign milestone save failed. Check if the `campaign_milestones` table and policies already exist in Supabase.";
    }

    return message;
  }

  function buildNextRowForm(nextCampaignId: string, rows: CampaignMilestoneRow[] = []) {
    const nextIndex = rows.length + 1;

    return {
      campaignId: nextCampaignId || campaignId || "",
      title: `Milestone ${nextIndex}`,
      targetAmount: "",
      rowStart: "",
      rowEnd: "",
      displayOrder: String(nextIndex),
      status: "Active" as const,
      note: ""
    };
  }

  async function loadCampaignOptions(preferredCampaignId = "") {
    if (!supabase) {
      setCampaignOptions([]);
      return;
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
    setRowForm((current) => ({
      ...current,
      campaignId: current.campaignId || preferredCampaignId || nextOptions[0]?.id || ""
    }));
  }

  async function loadMilestoneRows(nextCampaignId: string) {
    if (!supabase || !nextCampaignId) {
      setMilestoneRows([]);
      return;
    }

    const { data, error } = await supabase
      .from("campaign_milestones")
      .select("*")
      .eq("campaign_id", nextCampaignId)
      .order("display_order", { ascending: true })
      .returns<CampaignMilestoneRow[]>();

    if (error) throw error;
    const nextRows = data ?? [];
    setMilestoneRows(nextRows);

    if (!editingRowId) {
      setRowForm((current) => {
        const isDirty = Boolean(
          current.title.trim() ||
          current.targetAmount.trim() ||
          current.rowStart.trim() ||
          current.rowEnd.trim() ||
          current.note.trim()
        );

        if (isDirty && current.campaignId === nextCampaignId) return current;
        return buildNextRowForm(nextCampaignId, nextRows);
      });
    }
  }

  function resetRowForm() {
    setEditingRowId("");
    setRowForm(buildNextRowForm(rowForm.campaignId || campaignId, milestoneRows));
  }

  useEffect(() => {
    async function load() {
      try {
        const [campaignRes, donationSummary] = await Promise.all([
          supabase?.from("campaigns").select("id, title, summary, internal_amount, status").eq("featured", true).eq("is_past", false).limit(1).maybeSingle(),
          getDonationSummary().catch(() => null)
        ]);

        const publicRaised = donationSummary?.totalDonations ?? 0;
        const internalRaised = Number(campaignRes?.data?.internal_amount ?? 0);
        const nextCampaignId = campaignRes?.data?.id ?? "";

        setCampaignId(nextCampaignId);
        setForm({
          campaignTitle: campaignRes?.data?.title ?? "",
          campaignDescription: campaignRes?.data?.summary ?? "",
          status: campaignRes?.data?.status ?? "Active"
        });
        await loadCampaignOptions(nextCampaignId);
        await loadMilestoneRows(nextCampaignId);
        setSnapshot({
          publicRaised,
          internalRaised,
          totalRaised: publicRaised + internalRaised,
          donorCount: donationSummary?.donorCount ?? 0
        });
      } catch (error) {
        showCampaignAlert("danger", error instanceof Error ? error.message : "Failed to load milestone settings.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [showCampaignAlert]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return showCampaignAlert("danger", "Supabase is not configured.");
    if (!form.campaignTitle.trim()) return showCampaignAlert("warning", "Active campaign title is required.");

    setSaving(true);
    try {
      let nextCampaignId =
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
            status: form.status
          })
          .eq("id", nextCampaignId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("campaigns")
          .insert({
            title: form.campaignTitle.trim(),
            summary: form.campaignDescription.trim(),
            status: form.status,
            outcome: "",
            featured: true,
            is_past: false
          })
          .select("id")
          .single();
        if (error) throw error;
        nextCampaignId = data.id;
      }

      setCampaignId(nextCampaignId);
      await loadCampaignOptions(nextCampaignId);
      setRowForm((current) => ({
        ...buildNextRowForm(nextCampaignId, milestoneRows),
        campaignId: current.campaignId || nextCampaignId
      }));
      invalidateSiteContentCache();
      showCampaignAlert("success", "Milestone campaign saved.");
    } catch (error) {
      showCampaignAlert("danger", error instanceof Error ? error.message : "Milestone save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRowSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return showRowAlert("danger", "Supabase is not configured.");
    if (!rowForm.campaignId) return showRowAlert("warning", "Select a campaign first.");
    if (!rowForm.title.trim()) return showRowAlert("warning", "Milestone title is required.");
    if (Number(rowForm.targetAmount || 0) <= 0) return showRowAlert("warning", "Target amount must be greater than 0.");
    if (Number(rowForm.rowStart || 0) <= 0) return showRowAlert("warning", "Row start must be greater than 0.");
    if (Number(rowForm.rowEnd || 0) < Number(rowForm.rowStart || 0)) return showRowAlert("warning", "Row end must be greater than or equal to row start.");

    setRowSaving(true);
    try {
      const payload = {
        campaign_id: rowForm.campaignId,
        title: rowForm.title.trim(),
        target_amount: Number(rowForm.targetAmount || 0),
        row_start: Number(rowForm.rowStart || 0),
        row_end: Number(rowForm.rowEnd || 0),
        display_order: Number(rowForm.displayOrder || 0),
        status: rowForm.status,
        note: rowForm.note.trim()
      };

      if (editingRowId) {
        const { error } = await supabase
          .from("campaign_milestones")
          .update(payload)
          .eq("id", editingRowId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("campaign_milestones")
          .insert(payload);
        if (error) throw error;
      }

      await loadMilestoneRows(rowForm.campaignId);
      resetRowForm();
      invalidateSiteContentCache();
      showRowAlert("success", editingRowId ? "Campaign milestone updated." : "Campaign milestone added.");
    } catch (error) {
      showRowAlert("danger", toMilestoneErrorMessage(error));
    } finally {
      setRowSaving(false);
    }
  }

  function handleEdit() {
    titleInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    titleInputRef.current?.focus();
  }

  function handleRowEdit(row: CampaignMilestoneRow) {
    setEditingRowId(row.id);
    setRowForm({
      campaignId: row.campaign_id,
      title: row.title,
      targetAmount: String(row.target_amount),
      rowStart: String(row.row_start),
      rowEnd: String(row.row_end),
      displayOrder: String(row.display_order),
      status: row.status,
      note: row.note ?? ""
    });
    window.requestAnimationFrame(() => {
      rowTitleInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      rowTitleInputRef.current?.focus();
    });
  }

  async function handleDelete() {
    if (!supabase) return showCampaignAlert("danger", "Supabase is not configured.");
    if (!campaignId) return showCampaignAlert("warning", "No active milestone entry to delete.");
    const confirmed = window.confirm("Delete this milestone campaign?");
    if (!confirmed) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("campaigns")
        .update({ title: "", summary: "", status: "Active" })
        .eq("id", campaignId);
      if (error) throw error;

      setForm({ campaignTitle: "", campaignDescription: "", status: "Active" });
      setCampaignId("");
      setCampaignOptions([]);
      setMilestoneRows([]);
      setRowForm({ campaignId: "", title: "Milestone 1", targetAmount: "", rowStart: "", rowEnd: "", displayOrder: "1", status: "Active", note: "" });
      setEditingRowId("");
      invalidateSiteContentCache();
      showCampaignAlert("success", "Milestone campaign cleared.");
    } catch (error) {
      showCampaignAlert("danger", error instanceof Error ? error.message : "Delete milestone failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRowDelete(id: string) {
    if (!supabase) return showRowAlert("danger", "Supabase is not configured.");
    const confirmed = window.confirm("Delete this campaign milestone?");
    if (!confirmed) return;

    setRowSaving(true);
    try {
      const { error } = await supabase
        .from("campaign_milestones")
        .delete()
        .eq("id", id);
      if (error) throw error;

      const targetCampaignId = rowForm.campaignId || campaignId;
      if (editingRowId === id) resetRowForm();
      await loadMilestoneRows(targetCampaignId);
      invalidateSiteContentCache();
      showRowAlert("success", "Campaign milestone deleted.");
    } catch (error) {
      showRowAlert("danger", toMilestoneErrorMessage(error));
    } finally {
      setRowSaving(false);
    }
  }

  return (
    <section className="admin-panel">
      <p className="eyebrow">Milestone</p>
      <h2>Campaign Milestones</h2>
      <p className="muted-text">Set the active campaign first, then define milestone stages with their own targets and assigned contribution ranges.</p>
      {campaignMessage ? <p className={`admin-alert ${campaignTone}`}>{campaignMessage}</p> : null}

      <form className="admin-settings-form" onSubmit={handleSubmit}>
        <label>
          <span>Active Campaign Title</span>
          <input ref={titleInputRef} value={form.campaignTitle} onChange={(e) => setForm((current) => ({ ...current, campaignTitle: e.target.value }))} placeholder="Worldwide Promo Push" disabled={saving} />
        </label>
        <label>
          <span>Campaign Description</span>
          <textarea
            value={form.campaignDescription}
            onChange={(e) => setForm((current) => ({ ...current, campaignDescription: e.target.value }))}
            placeholder="Short description shown below the campaign title."
            disabled={saving}
          />
        </label>
        <label>
          <span>Status</span>
          <select value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value as MilestoneForm["status"] }))} disabled={saving}>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
          </select>
        </label>
        <button className="lookup-button" type="submit" disabled={saving}>
          {saving ? "Saving..." : campaignId ? "Update Milestone" : "Save Milestone"}
        </button>
      </form>

      <div className="admin-summary-table-wrap">
        <table className="admin-summary-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Description</th>
              <th>Combined Target</th>
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
              <td>{formatCurrency(getMilestoneTargetTotal(milestoneRows))}</td>
              <td>{formatCurrency(snapshot.totalRaised)}</td>
              <td>
                {getMilestoneTargetTotal(milestoneRows) > 0
                  ? `${Math.min(Math.round((snapshot.totalRaised / getMilestoneTargetTotal(milestoneRows)) * 100), 100)}%`
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

      <div className="admin-milestone-subpanel">
        <h3>Milestone Buckets</h3>
        <p className="muted-text">Each milestone stays under a campaign but has its own target, row range, and display order. The combined milestone target now acts as the campaign total.</p>
        {rowMessage ? <p className={`admin-alert ${rowTone}`}>{rowMessage}</p> : null}

        <form className="admin-settings-form" onSubmit={handleRowSubmit}>
          <label>
            <span>Campaign</span>
            <select
              value={rowForm.campaignId}
              onChange={(e) => {
                const nextCampaignId = e.target.value;
                setRowForm((current) => ({ ...current, campaignId: nextCampaignId }));
                void loadMilestoneRows(nextCampaignId);
              }}
              disabled={rowSaving}
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
            <span>Milestone Title</span>
            <input ref={rowTitleInputRef} value={rowForm.title} onChange={(e) => setRowForm((current) => ({ ...current, title: e.target.value }))} placeholder="Milestone 1" disabled={rowSaving} />
          </label>
          <label>
            <span>Target Amount</span>
            <input type="number" min="0" value={rowForm.targetAmount} onChange={(e) => setRowForm((current) => ({ ...current, targetAmount: e.target.value }))} placeholder="650000" disabled={rowSaving} />
          </label>
          <label>
            <span>Row Start</span>
            <input type="number" min="1" value={rowForm.rowStart} onChange={(e) => setRowForm((current) => ({ ...current, rowStart: e.target.value }))} placeholder="2" disabled={rowSaving} />
          </label>
          <label>
            <span>Row End</span>
            <input type="number" min="1" value={rowForm.rowEnd} onChange={(e) => setRowForm((current) => ({ ...current, rowEnd: e.target.value }))} placeholder="100" disabled={rowSaving} />
          </label>
          <label>
            <span>Display Order</span>
            <input type="number" min="1" value={rowForm.displayOrder} onChange={(e) => setRowForm((current) => ({ ...current, displayOrder: e.target.value }))} placeholder="1" disabled={rowSaving} />
          </label>
          <label>
            <span>Status</span>
            <select value={rowForm.status} onChange={(e) => setRowForm((current) => ({ ...current, status: e.target.value as MilestoneRowForm["status"] }))} disabled={rowSaving}>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
            </select>
          </label>
          <label>
            <span>Note</span>
            <textarea value={rowForm.note} onChange={(e) => setRowForm((current) => ({ ...current, note: e.target.value }))} placeholder="Optional milestone note." disabled={rowSaving} />
          </label>
          <div className="admin-table-actions">
            <button className="lookup-button" type="submit" disabled={rowSaving}>
              {rowSaving ? "Saving..." : editingRowId ? "Update Campaign Milestone" : "Add Campaign Milestone"}
            </button>
            {editingRowId ? (
              <button className="button secondary" type="button" onClick={resetRowForm} disabled={rowSaving}>
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>

        <div className="admin-summary-table-wrap">
          <table className="admin-summary-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Campaign</th>
                <th>Target</th>
                <th>Rows</th>
                <th>Order</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {milestoneRows.length ? milestoneRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.title}</td>
                  <td>{campaignOptions.find((option) => option.id === row.campaign_id)?.title ?? "Campaign"}</td>
                  <td>{formatCurrency(Number(row.target_amount || 0))}</td>
                  <td>{row.row_start}-{row.row_end}</td>
                  <td>{row.display_order}</td>
                  <td>{row.status}</td>
                  <td>
                    <div className="admin-table-actions">
                      <button className="admin-inline-button" type="button" onClick={() => handleRowEdit(row)}>
                        Edit
                      </button>
                      <button className="admin-inline-button danger" type="button" onClick={() => void handleRowDelete(row.id)} disabled={rowSaving}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7}>No milestone buckets yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
