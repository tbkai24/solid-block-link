import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAdminAlert } from "../../hooks/useAdminAlert";
import { detectPlatformFromUrl, suggestUpdateSummary, suggestUpdateTitle } from "../../services/updateSuggestions";
import { UpdateRow } from "../../types/supabase";
import { socialLinks } from "../../config/socials";

type UpdateForm = {
  title: string;
  summary: string;
  label: string;
  platform: string;
  href: string;
  publishedAt: string;
  featured: boolean;
};

const emptyForm: UpdateForm = {
  title: "",
  summary: "",
  label: "Latest Update",
  platform: socialLinks[0]?.label ?? "Facebook",
  href: "",
  publishedAt: "",
  featured: true
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
    label: form.label,
    publishedAt: form.publishedAt
  });
  const suggestedSummary = suggestUpdateSummary({
    platform: form.platform,
    label: form.label
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
      content_label: form.label,
      platform: form.platform,
      href: form.href.trim() || "/updates",
      published_at: form.publishedAt ? new Date(form.publishedAt).toISOString() : new Date().toISOString(),
      featured: form.featured
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
      label: item.content_label,
      platform: item.platform,
      href: item.href,
      publishedAt: item.published_at ? item.published_at.slice(0, 10) : "",
      featured: item.featured
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
    showAlert("success", "Update removed.");
  }

  return (
    <section className="admin-panel">
      <p className="eyebrow">Updates</p>
      <h2>Social media updates</h2>
      <p className="muted-text">Add curated campaign posts and announcements that can appear on the homepage.</p>
      {message ? <p className={`admin-alert ${tone}`}>{message}</p> : null}
      <form className="admin-settings-form" onSubmit={handleSubmit}>
        <label>
          <span>Update Title</span>
          <input
            value={form.title}
            onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
            placeholder="Optional if URL is provided"
            disabled={loading || saving}
          />
        </label>
        <p className="muted-text">Suggested title: <strong>{suggestedTitle}</strong></p>
        <label>
          <span>Short Summary</span>
          <textarea value={form.summary} onChange={(e) => setForm((current) => ({ ...current, summary: e.target.value }))} placeholder="Optional if suggestion is enough" disabled={loading || saving} />
        </label>
        <p className="muted-text">Suggested summary: <strong>{suggestedSummary}</strong></p>
        <label>
          <span>Label</span>
          <select value={form.label} onChange={(e) => setForm((current) => ({ ...current, label: e.target.value }))} disabled={loading || saving}>
            <option value="Latest Update">Latest Update</option>
            <option value="Past Campaign">Past Campaign</option>
          </select>
        </label>
        <label>
          <span>Platform</span>
          <select value={form.platform} onChange={(e) => setForm((current) => ({ ...current, platform: e.target.value }))} disabled={loading || saving}>
            {socialLinks.map((item) => (
              <option key={item.label} value={item.label}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>URL</span>
          <input value={form.href} onChange={(e) => handleUrlChange(e.target.value)} placeholder="https://..." disabled={loading || saving} />
        </label>
        <label>
          <span>Published Date</span>
          <input type="date" value={form.publishedAt} onChange={(e) => setForm((current) => ({ ...current, publishedAt: e.target.value }))} disabled={loading || saving} />
        </label>
        <label className="admin-checkbox">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) => setForm((current) => ({ ...current, featured: e.target.checked }))}
            disabled={loading || saving}
          />
          <span>Featured on homepage</span>
        </label>
        <button className="lookup-button" type="submit" disabled={loading || saving}>
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
              <th>Label</th>
              <th>Platform</th>
              <th>Date</th>
              <th>Homepage</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {updates.map((item) => (
              <tr key={item.id}>
                <td>{item.title}</td>
                <td>{item.content_label}</td>
                <td>{item.platform}</td>
                <td>{new Date(item.published_at).toLocaleDateString()}</td>
                <td>{item.featured ? "Featured" : "Hidden"}</td>
                <td>
                  <div className="admin-table-actions">
                    <button className="admin-inline-button" type="button" onClick={() => handleEdit(item)}>
                      Edit
                    </button>
                    <button className="admin-inline-button" type="button" onClick={() => void handleDelete(item.id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!updates.length && !loading ? (
              <tr>
                <td colSpan={6} className="muted-text">No updates yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
