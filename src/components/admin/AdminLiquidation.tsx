// src/components/admin/AdminLiquidationPanel.tsx
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAdminAlert } from "../../hooks/useAdminAlert";
import { invalidateSiteContentCache } from "../../services/siteContentCache";

type LiquidationRow = {
  id: string;
  title: string;
  caption: string;
  image_url: string;
  report_url: string;
  published_at: string;
};

const BUCKET = "sbl-assets";

export function AdminLiquidationPanel() {
  const [posts, setPosts] = useState<LiquidationRow[]>([]);
  const [form, setForm] = useState({
    title: "",
    caption: "",
    reportUrl: "",
    imageFile: null as File | null,
    existingImageUrl: ""
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { message, tone, showAlert } = useAdminAlert();

  async function loadPosts() {
    if (!supabase) return setLoading(false);
    const { data, error } = await supabase
      .from("liquidations")
      .select("*")
      .order("published_at", { ascending: false });
    
    if (error) {
      showAlert("danger", error.message);
    } else {
      setPosts(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadPosts();
  }, [showAlert]);

  async function handleImageUpload(file: File): Promise<string> {
    if (!supabase) {
      throw new Error("Supabase client is not available.");
    }

    const extension = file.name.split(".").pop() || "png";
    const path = `liquidations/${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
    
    const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
    
    if (error) {
      // Provide a more specific error message if possible
      if (error.message.includes("bucket")) {
        throw new Error(`Storage bucket "${BUCKET}" not found or inaccessible.`);
      }
      throw error;
    }

    // Ensure data.path exists before getting public URL
    if (!data?.path) {
      throw new Error("Upload succeeded but no path was returned.");
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
    return urlData.publicUrl;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return showAlert("danger", "Supabase is not configured.");
    if (!form.title.trim()) return showAlert("warning", "Title is required.");
    if (!form.caption.trim()) return showAlert("warning", "Caption is required.");
    if (!form.imageFile && !form.existingImageUrl && !editingId) return showAlert("warning", "Image is required for new posts.");

    setSaving(true);
    try {
      let imageUrl = form.existingImageUrl;
      
      if (form.imageFile) {
        setUploading(true);
        imageUrl = await handleImageUpload(form.imageFile);
        setUploading(false);
      }

      const payload = {
        title: form.title.trim(),
        caption: form.caption.trim(),
        report_url: form.reportUrl.trim(),
        image_url: imageUrl,
        published_at: new Date().toISOString()
      };

      if (editingId) {
        const { error } = await supabase
          .from("liquidations")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        showAlert("success", "Liquidation post updated.");
      } else {
        const { error } = await supabase
          .from("liquidations")
          .insert(payload);
        if (error) throw error;
        showAlert("success", "Liquidation post added.");
      }

      setForm({ title: "", caption: "", reportUrl: "", imageFile: null, existingImageUrl: "" });
      setEditingId(null);
      await loadPosts();
      invalidateSiteContentCache();
    } catch (error) {
      setUploading(false);
      showAlert("danger", error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(post: LiquidationRow) {
    setEditingId(post.id);
    setForm({
      title: post.title,
      caption: post.caption,
      reportUrl: post.report_url ?? "",
      imageFile: null,
      existingImageUrl: post.image_url
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    if (!supabase) return showAlert("danger", "Supabase is not configured.");
    const confirmed = window.confirm("Delete this liquidation post?");
    if (!confirmed) return;

    const { error } = await supabase.from("liquidations").delete().eq("id", id);
    if (error) {
      showAlert("danger", error.message);
    } else {
      setPosts((current) => current.filter((p) => p.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setForm({ title: "", caption: "", reportUrl: "", imageFile: null, existingImageUrl: "" });
      }
      invalidateSiteContentCache();
      showAlert("success", "Post deleted.");
    }
  }

  return (
    <section className="admin-panel">
      <p className="eyebrow">Liquidation</p>
      <h2>Liquidation Posts</h2>
      <p className="muted-text">Manage project liquidation updates with images, captions, and report links.</p>
      {message ? <p className={`admin-alert ${tone}`}>{message}</p> : null}

      <form className="admin-settings-form" onSubmit={handleSubmit}>
        <label>
          <span>Title</span>
          <input
            value={form.title}
            onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
            placeholder="Project Name / Update Title"
            disabled={saving || uploading}
          />
        </label>
        <label>
          <span>Caption</span>
          <textarea
            value={form.caption}
            onChange={(e) => setForm((c) => ({ ...c, caption: e.target.value }))}
            placeholder="Details about the liquidation..."
            disabled={saving || uploading}
          />
        </label>
        <label>
          <span>Google Sheet link</span>
          <input
            type="url"
            value={form.reportUrl}
            onChange={(e) => setForm((c) => ({ ...c, reportUrl: e.target.value }))}
            placeholder="https://docs.google.com/spreadsheets/..."
            disabled={saving || uploading}
          />
        </label>
        <label>
          <span>Image</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setForm((c) => ({ ...c, imageFile: file }));
            }}
            disabled={saving || uploading}
          />
        </label>
        {form.existingImageUrl && !form.imageFile && (
          <img src={form.existingImageUrl} alt="Current" className="admin-logo-preview" style={{ borderRadius: 8, width: 100, height: 100, objectFit: 'cover' }} />
        )}
        <div className="admin-table-actions">
          <button className="lookup-button" type="submit" disabled={saving || uploading}>
            {saving || uploading ? "Saving..." : editingId ? "Update Post" : "Add Post"}
          </button>
          {editingId && (
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setEditingId(null);
                setForm({ title: "", caption: "", reportUrl: "", imageFile: null, existingImageUrl: "" });
              }}
              disabled={saving}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="admin-summary-table-wrap">
        <table className="admin-summary-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Caption</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id}>
                <td><strong>{post.title}</strong></td>
                <td className="admin-campaign-description-cell">{post.caption}</td>
                <td>{new Date(post.published_at).toLocaleDateString()}</td>
                <td>
                  <div className="admin-table-actions">
                    <button className="admin-inline-button" type="button" onClick={() => handleEdit(post)}>Edit</button>
                    <button className="admin-inline-button danger" type="button" onClick={() => void handleDelete(post.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {!posts.length && !loading && <tr><td colSpan={4} className="muted-text">No liquidation posts yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
