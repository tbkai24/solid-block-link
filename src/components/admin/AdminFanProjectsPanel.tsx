import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useAdminAlert } from "../../hooks/useAdminAlert";
import { supabase } from "../../lib/supabase";
import { FanProjectRow } from "../../types/supabase";

const BUCKET = "sbl-assets";

const emptyForm = {
  title: "",
  category: "Promotional Campaign",
  region: "Global",
  addedBy: "Solid Block Link",
  description: "",
  eventDate: "",
  eventTime: "",
  eventTimezone: "",
  eventLocation: "",
  imageFile: null as File | null,
  existingImageUrl: "",
  status: "Upcoming" as FanProjectRow["status"],
  visibility: "public" as FanProjectRow["visibility"],
  teaserText: "",
  noteText: "A'TINTION: Share the experience, amplify the campaign, and help more people discover SB19.",
  relatedLink: "",
  displayOrder: "0",
  featured: true
};

export function AdminFanProjectsPanel() {
  const [projects, setProjects] = useState<FanProjectRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { message, tone, showAlert } = useAdminAlert();

  async function loadProjects() {
    if (!supabase) return setLoading(false);

    const { data, error } = await supabase
      .from("fan_projects")
      .select("*")
      .order("display_order", { ascending: true })
      .order("published_at", { ascending: false });

    if (error) {
      showAlert("danger", `${error.message}. Run the fan_projects SQL if this table does not exist yet.`);
    } else {
      setProjects((data ?? []) as FanProjectRow[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadProjects();
  }, [showAlert]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  async function uploadImage(file: File) {
    if (!supabase) throw new Error("Supabase client is not available.");

    const extension = file.name.split(".").pop() || "jpg";
    const path = `fan-projects/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
    const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });

    if (error) throw error;
    if (!data?.path) throw new Error("Upload succeeded but no path was returned.");

    return supabase.storage.from(BUCKET).getPublicUrl(data.path).data.publicUrl;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return showAlert("danger", "Supabase is not configured.");
    if (!form.title.trim()) return showAlert("warning", "Project title is required.");
    if (!form.description.trim()) return showAlert("warning", "Description is required.");
    if (!form.imageFile && !form.existingImageUrl && !editingId) return showAlert("warning", "Image is required for new projects.");

    setSaving(true);
    try {
      let imageUrl = form.existingImageUrl;

      if (form.imageFile) {
        setUploading(true);
        imageUrl = await uploadImage(form.imageFile);
        setUploading(false);
      }

      const payload = {
        title: form.title.trim(),
        category: form.category.trim(),
        region: form.region.trim(),
        added_by: form.addedBy.trim() || "Solid Block Link",
        description: form.description.trim(),
        event_date: form.eventDate || null,
        event_time: form.eventTime || null,
        event_timezone: form.eventTimezone.trim() || null,
        event_location: form.eventLocation.trim() || null,
        image_url: imageUrl,
        status: form.status,
        visibility: form.visibility,
        teaser_text: form.teaserText.trim(),
        note_text: form.noteText.trim(),
        related_link: form.relatedLink.trim(),
        display_order: Number(form.displayOrder) || 0,
        featured: form.featured,
        published_at: new Date().toISOString()
      };

      if (editingId) {
        const { error } = await supabase.from("fan_projects").update(payload).eq("id", editingId);
        if (error) throw error;
        showAlert("success", "Fan project updated.");
      } else {
        const { error } = await supabase.from("fan_projects").insert(payload);
        if (error) throw error;
        showAlert("success", "Fan project added.");
      }

      resetForm();
      await loadProjects();
    } catch (error) {
      setUploading(false);
      showAlert("danger", error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) setForm((current) => ({ ...current, imageFile: file }));
  }

  function handleEdit(project: FanProjectRow) {
    setEditingId(project.id);
    setForm({
      title: project.title,
      category: project.category,
      region: project.region,
      addedBy: project.added_by || "Solid Block Link",
      description: project.description,
      eventDate: project.event_date ?? "",
      eventTime: project.event_time ?? "",
      eventTimezone: project.event_timezone ?? "",
      eventLocation: project.event_location ?? "",
      imageFile: null,
      existingImageUrl: project.image_url,
      status: project.status,
      visibility: project.visibility,
      teaserText: project.teaser_text ?? "",
      noteText: project.note_text ?? "",
      relatedLink: project.related_link ?? "",
      displayOrder: String(project.display_order ?? 0),
      featured: project.featured
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    if (!supabase) return showAlert("danger", "Supabase is not configured.");
    const confirmed = window.confirm("Delete this fan project?");
    if (!confirmed) return;

    const { error } = await supabase.from("fan_projects").delete().eq("id", id);

    if (error) {
      showAlert("danger", error.message);
      return;
    }

    setProjects((current) => current.filter((project) => project.id !== id));
    if (editingId === id) resetForm();
    showAlert("success", "Fan project deleted.");
  }

  return (
    <section className="admin-panel">
      <p className="eyebrow">Fan Projects</p>
      <h2>Fan project board</h2>
      <p className="muted-text">Manage public, reveal-soon, and private fan project cards. Private projects are ready for future role-based access.</p>
      {message ? <p className={`admin-alert ${tone}`}>{message}</p> : null}

      <form className="admin-settings-form" onSubmit={handleSubmit}>
        <label>
          <span>Project Title</span>
          <input value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} disabled={saving || uploading} />
        </label>
        <label>
          <span>Category</span>
          <input value={form.category} onChange={(e) => setForm((current) => ({ ...current, category: e.target.value }))} disabled={saving || uploading} />
        </label>
        <label>
          <span>Region</span>
          <input value={form.region} onChange={(e) => setForm((current) => ({ ...current, region: e.target.value }))} placeholder="Global, Philippines, USA, Canada, LATAM, Oceania" disabled={saving || uploading} />
        </label>
        <label>
          <span>Added By</span>
          <input value={form.addedBy} onChange={(e) => setForm((current) => ({ ...current, addedBy: e.target.value }))} placeholder="Solid Block Link, SBL Philippines, SBL USA" disabled={saving || uploading} />
        </label>
        <label>
          <span>Description</span>
          <textarea value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} disabled={saving || uploading} />
        </label>
        <label>
          <span>Event Date</span>
          <input type="date" value={form.eventDate} onChange={(e) => setForm((current) => ({ ...current, eventDate: e.target.value }))} disabled={saving || uploading} />
        </label>
        <label>
          <span>Event Time</span>
          <input type="time" value={form.eventTime} onChange={(e) => setForm((current) => ({ ...current, eventTime: e.target.value }))} disabled={saving || uploading} />
        </label>
        <label>
          <span>Timezone</span>
          <input value={form.eventTimezone} onChange={(e) => setForm((current) => ({ ...current, eventTimezone: e.target.value }))} placeholder="PHT, CDT, GMT, EST" disabled={saving || uploading} />
        </label>
        <label>
          <span>Location</span>
          <input value={form.eventLocation} onChange={(e) => setForm((current) => ({ ...current, eventLocation: e.target.value }))} placeholder="Your Hotel, Navy Pier, Online" disabled={saving || uploading} />
        </label>
        <label>
          <span>Teaser Text</span>
          <textarea value={form.teaserText} onChange={(e) => setForm((current) => ({ ...current, teaserText: e.target.value }))} placeholder="Shown for reveal-soon projects." disabled={saving || uploading} />
        </label>
        <label>
          <span>Project Note</span>
          <textarea value={form.noteText} onChange={(e) => setForm((current) => ({ ...current, noteText: e.target.value }))} placeholder="Optional note shown in the callout box, e.g. pickup instructions or A'TINTION reminder." disabled={saving || uploading} />
        </label>
        <label>
          <span>Related Link</span>
          <input value={form.relatedLink} onChange={(e) => setForm((current) => ({ ...current, relatedLink: e.target.value }))} placeholder="Optional URL" disabled={saving || uploading} />
        </label>
        <label>
          <span>Upload Image</span>
          <input type="file" accept="image/*" onChange={handleImageChange} disabled={saving || uploading} />
        </label>
        {form.imageFile ? <p className="muted-text">Selected: {form.imageFile.name}</p> : null}
        {form.existingImageUrl && !form.imageFile ? (
          <img className="admin-logo-preview" src={form.existingImageUrl} alt="Current fan project" />
        ) : null}
        <label>
          <span>Status</span>
          <select value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value as FanProjectRow["status"] }))} disabled={saving || uploading}>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
            <option value="Upcoming">Upcoming</option>
          </select>
        </label>
        <label>
          <span>Visibility</span>
          <select value={form.visibility} onChange={(e) => setForm((current) => ({ ...current, visibility: e.target.value as FanProjectRow["visibility"] }))} disabled={saving || uploading}>
            <option value="public">Public</option>
            <option value="reveal-soon">Reveal Soon</option>
            <option value="private">Private</option>
          </select>
        </label>
        <label>
          <span>Display Order</span>
          <input type="number" value={form.displayOrder} onChange={(e) => setForm((current) => ({ ...current, displayOrder: e.target.value }))} disabled={saving || uploading} />
        </label>
        <label className="admin-checkbox">
          <input type="checkbox" checked={form.featured} onChange={(e) => setForm((current) => ({ ...current, featured: e.target.checked }))} disabled={saving || uploading} />
          <span>Featured on fan projects page</span>
        </label>
        <div className="admin-table-actions">
          <button className="lookup-button" type="submit" disabled={saving || uploading}>
            {saving || uploading ? "Saving..." : editingId ? "Update Project" : "Add Project"}
          </button>
          {editingId ? (
            <button className="button secondary" type="button" onClick={resetForm} disabled={saving || uploading}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="admin-summary-table-wrap">
        <table className="admin-summary-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Visibility</th>
              <th>Status</th>
              <th>Region</th>
              <th>Added By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id}>
                <td><strong>{project.title}</strong></td>
                <td>
                  <span className={`admin-badge ${project.visibility === "public" ? "public" : "unlisted"}`}>
                    {project.visibility}
                  </span>
                </td>
                <td>
                  <span className={`admin-badge ${project.status === "Active" ? "active" : project.status === "Completed" ? "completed" : "pending"}`}>
                    {project.status}
                  </span>
                </td>
                <td>{project.region}</td>
                <td>{project.added_by}</td>
                <td>
                  <div className="admin-table-actions">
                    <button className="admin-inline-button" type="button" onClick={() => handleEdit(project)}>Edit</button>
                    <button className="admin-inline-button danger" type="button" onClick={() => void handleDelete(project.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {!projects.length && !loading ? (
              <tr><td colSpan={6} className="muted-text">No fan projects yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
