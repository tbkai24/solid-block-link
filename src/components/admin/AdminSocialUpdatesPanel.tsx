import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAdminAlert } from "../../hooks/useAdminAlert";
import { invalidateSiteContentCache } from "../../services/siteContentCache";
import { detectPlatformFromUrl, suggestUpdateSummary, suggestUpdateTitle } from "../../services/updateSuggestions";
import { UpdateRow } from "../../types/supabase";
import { socialLinks } from "../../config/socials";

type UpdateForm = {
  title: string;
  summary: string;
  category: string;
  platform: string;
  href: string;
  publishedAt: string;
  featured: boolean;
  showAsPopup: boolean;
  popupImageUrl: string;
  popupFrequency: "once" | "daily" | "always";
  popupExpiresAt: string;
};

const updateCategories = ["Announcement", "Campaign", "Fan Project"] as const;

const emptyForm: UpdateForm = {
  title: "",
  summary: "",
  category: "Campaign",
  platform: socialLinks[0]?.label ?? "Facebook",
  href: "",
  publishedAt: "",
  featured: true,
  showAsPopup: false,
  popupImageUrl: "",
  popupFrequency: "once",
  popupExpiresAt: ""
};

export function AdminSocialUpdatesPanel() {
  const [updates, setUpdates] = useState<UpdateRow[]>([]);
  const [form, setForm] = useState<UpdateForm>(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { message, tone, showAlert } = useAdminAlert();
  const suggestedTitle = suggestUpdateTitle({
    url: form.href,
    platform: form.platform,
    label: form.category,
    publishedAt: form.publishedAt
  });
  const suggestedSummary = suggestUpdateSummary({
    platform: form.platform,
    label: form.category
  });

  useEffect(() => {
    async function load() {
      if (!supabase) return setLoading(false);
      const { data, error } = await supabase.from("updates").select("*").order("published_at", { ascending: false }).limit(8);
      if (error) showAlert("danger", error.message);
      setUpdates(data ?? []);
      setLoading(false);
    }
    void load();
  }, [showAlert]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return showAlert("danger", "Supabase is not configured.");
    setSaving(true);
    const payload = {
      title: form.title.trim() || suggestedTitle,
      summary: form.summary.trim() || suggestedSummary,
      content_label: form.category,
      update_category: form.category,
      platform: form.platform,
      href: form.href.trim() || "/updates",
      published_at: form.publishedAt ? new Date(form.publishedAt).toISOString() : new Date().toISOString(),
      featured: form.featured,
      show_as_popup: form.showAsPopup,
      popup_image_url: form.popupImageUrl.trim(),
      popup_frequency: form.popupFrequency,
      popup_expires_at: form.popupExpiresAt ? new Date(form.popupExpiresAt).toISOString() : null
    };

    const response = editingId
      ? await supabase.from("updates").update(payload).eq("id", editingId).select("*").single<UpdateRow>()
      : await supabase.from("updates").insert(payload).select("*").single<UpdateRow>();
    const { data, error } = response;
    if (error) {
      showAlert("danger", error.message);
      setSaving(false);
      return;
    }

    setUpdates((current) =>
      editingId
        ? current.map((item) => (item.id === editingId ? data : item))
        : [data, ...current].slice(0, 8)
    );
    invalidateSiteContentCache();
    setForm(emptyForm);
    setEditingId("");
    showAlert("success", editingId ? "Update saved." : "Update added.");
    setSaving(false);
  }

  function handleUrlChange(value: string) {
    const detectedPlatform = detectPlatformFromUrl(value);
    setForm((current) => ({
      ...current,
      href: value,
      platform: detectedPlatform || current.platform
    }));
  }

  function handleEdit(item: UpdateRow) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      summary: item.summary,
      category: item.update_category || item.content_label,
      platform: item.platform,
      href: item.href,
      publishedAt: item.published_at ? item.published_at.slice(0, 10) : "",
      featured: item.featured,
      showAsPopup: Boolean(item.show_as_popup),
      popupImageUrl: item.popup_image_url || "",
      popupFrequency: item.popup_frequency || "once",
      popupExpiresAt: item.popup_expires_at ? item.popup_expires_at.slice(0, 16) : ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancelEdit() {
    setEditingId("");
    setForm(emptyForm);
  }

  async function handleDelete(id: string) {
    if (!supabase) return showAlert("danger", "Supabase is not configured.");
    const confirmed = window.confirm("Delete this social update?");
    if (!confirmed) return;
    const { error } = await supabase.from("updates").delete().eq("id", id);
    if (error) return showAlert("danger", error.message);
    setUpdates((current) => current.filter((item) => item.id !== id));
    if (editingId === id) {
      setEditingId("");
      setForm(emptyForm);
    }
    invalidateSiteContentCache();
    showAlert("success", "Update removed.");
  }

  return (
    <section className="admin-panel">
      <p className="eyebrow">Updates</p>
      <h2>Social media updates</h2>
      <p className="muted-text">Add campaign posts, fan project updates, and announcements. Use the Liquidation panel for liquidation records.</p>
      {message ? <p className={`admin-alert ${tone}`}>{message}</p> : null}
      <form className="admin-settings-form" onSubmit={handleSubmit}>
        <label>
          <span>Update Title</span>
          <input
            value={form.title}
            onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
            placeholder="Optional if URL is provided"
            disabled={saving}
          />
        </label>
        <p className="muted-text">Suggested title: <strong>{suggestedTitle}</strong></p>
        <label>
          <span>Short Summary</span>
          <textarea value={form.summary} onChange={(e) => setForm((current) => ({ ...current, summary: e.target.value }))} placeholder="Optional if suggestion is enough" disabled={saving} />
        </label>
        <p className="muted-text">Suggested summary: <strong>{suggestedSummary}</strong></p>
        <label>
          <span>Category</span>
          <select value={form.category} onChange={(e) => setForm((current) => ({ ...current, category: e.target.value }))} disabled={saving}>
            {updateCategories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Platform</span>
          <select value={form.platform} onChange={(e) => setForm((current) => ({ ...current, platform: e.target.value }))} disabled={saving}>
            {socialLinks.map((item) => (
              <option key={item.label} value={item.label}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>URL</span>
          <input value={form.href} onChange={(e) => handleUrlChange(e.target.value)} placeholder="https://..." disabled={saving} />
        </label>
        <label>
          <span>Published Date</span>
          <input type="date" value={form.publishedAt} onChange={(e) => setForm((current) => ({ ...current, publishedAt: e.target.value }))} disabled={saving} />
        </label>
        <label className="admin-checkbox">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) => setForm((current) => ({ ...current, featured: e.target.checked }))}
            disabled={saving}
          />
          <span>Featured on homepage</span>
        </label>
        <label className="admin-checkbox">
          <input
            type="checkbox"
            checked={form.showAsPopup}
            onChange={(e) => setForm((current) => ({ ...current, showAsPopup: e.target.checked }))}
            disabled={saving}
          />
          <span>Show as opening popup</span>
        </label>
        <label>
          <span>Popup Image URL</span>
          <input
            value={form.popupImageUrl}
            onChange={(e) => setForm((current) => ({ ...current, popupImageUrl: e.target.value }))}
            placeholder="https://..."
            disabled={saving}
          />
        </label>
        <label>
          <span>Popup Frequency</span>
          <select
            value={form.popupFrequency}
            onChange={(e) => setForm((current) => ({ ...current, popupFrequency: e.target.value as UpdateForm["popupFrequency"] }))}
            disabled={saving}
          >
            <option value="once">Once per visitor</option>
            <option value="daily">Once per day</option>
            <option value="always">Every visit</option>
          </select>
        </label>
        <label>
          <span>Popup Expiry</span>
          <input
            type="datetime-local"
            value={form.popupExpiresAt}
            onChange={(e) => setForm((current) => ({ ...current, popupExpiresAt: e.target.value }))}
            disabled={saving}
          />
        </label>
        <button className="lookup-button" type="submit" disabled={saving}>
          {saving ? "Saving..." : editingId ? "Update Entry" : "Add Update"}
        </button>
        {editingId ? (
          <button className="admin-inline-button" type="button" onClick={handleCancelEdit} disabled={saving}>
            Cancel Edit
          </button>
        ) : null}
      </form>
      <div className="admin-summary-table-wrap">
        <table className="admin-summary-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Platform</th>
              <th>Date</th>
              <th>Homepage</th>
              <th>Popup</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {updates.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.title}</strong></td>
                <td>{item.update_category || item.content_label}</td>
                <td>{item.platform}</td>
                <td>{new Date(item.published_at).toLocaleDateString()}</td>
                <td>
                  <span className={`admin-badge ${item.featured ? "featured" : "hidden"}`}>
                    {item.featured ? "Featured" : "Hidden"}
                  </span>
                </td>
                <td>
                  <span className={`admin-badge ${item.show_as_popup ? "on" : "off"}`}>
                    {item.show_as_popup ? "Popup On" : "Off"}
                  </span>
                </td>
                <td>
                  <div className="admin-table-actions">
                    <button className="admin-inline-button" type="button" onClick={() => handleEdit(item)}>
                      Edit
                    </button>
                    <button className="admin-inline-button danger" type="button" onClick={() => void handleDelete(item.id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!updates.length && !loading ? (
              <tr>
                <td colSpan={7} className="muted-text">No updates yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
