import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useAdminAlert } from "../../hooks/useAdminAlert";
import { fetchSiteSettings, saveSiteSettings, toSiteSettingsForm, uploadSiteLogo } from "../../services/siteSettings";
import { SiteSettingsFormData } from "../../types/siteSettings";

const emptyForm = toSiteSettingsForm();

export function AdminSiteSettingsPanel() {
  const [form, setForm] = useState<SiteSettingsFormData>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { message, tone, showAlert } = useAdminAlert();

  useEffect(() => {
    fetchSiteSettings()
      .then((data) => setForm(toSiteSettingsForm(data)))
      .catch((error) => showAlert("danger", error.message))
      .finally(() => setLoading(false));
  }, [showAlert]);

  function updateField<K extends keyof SiteSettingsFormData>(key: K, value: SiteSettingsFormData[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const logoUrl = await uploadSiteLogo(file);
      updateField("logoUrl", logoUrl);
      showAlert("success", "Logo uploaded. Save settings to publish it.");
    } catch (error) {
      showAlert("danger", error instanceof Error ? error.message : "Logo upload failed.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await saveSiteSettings(form);
      showAlert("success", "Site settings saved.");
    } catch (error) {
      showAlert("danger", error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-panel admin-site-settings">
      <p className="eyebrow">Brand</p>
      <h2>Homepage and About</h2>
      {message ? <p className={`admin-alert ${tone}`}>{message}</p> : null}
      <form className="admin-settings-form" onSubmit={handleSubmit}>
        <label>
          <span>Hero Title</span>
          <input value={form.heroTitle} onChange={(e) => updateField("heroTitle", e.target.value)} placeholder="Power the Global Rise of SB19" disabled={loading} />
        </label>
        <label>
          <span>Hero Summary</span>
          <textarea value={form.heroSummary} onChange={(e) => updateField("heroSummary", e.target.value)} placeholder="Short supporting copy for the homepage hero section." disabled={loading} />
        </label>
        <label>
          <span>Donate CTA URL</span>
          <input value={form.donateCtaUrl} onChange={(e) => updateField("donateCtaUrl", e.target.value)} placeholder="https://your-donate-link.com" disabled={loading} />
        </label>
        <label>
          <span>Lookup CTA URL</span>
          <input value={form.lookupCtaUrl} onChange={(e) => updateField("lookupCtaUrl", e.target.value)} placeholder="https://sbl-donation-lookup.vercel.app/" disabled={loading} />
        </label>
        <label>
          <span>Logo Upload</span>
          <input type="file" accept="image/*" onChange={handleUpload} disabled={loading || uploading} />
        </label>
        <p className="muted-text">Uses Supabase Storage bucket: <strong>sbl-assets</strong></p>
        {form.logoUrl ? <img className="admin-logo-preview" src={form.logoUrl} alt="Logo preview" /> : null}
        <label>
          <span>About Intro</span>
          <textarea value={form.aboutIntro} onChange={(e) => updateField("aboutIntro", e.target.value)} placeholder="Short introduction for the About page." disabled={loading} />
        </label>
        <label>
          <span>About Story</span>
          <textarea value={form.aboutStory} onChange={(e) => updateField("aboutStory", e.target.value)} placeholder="Tell the Solid Block Link story here." disabled={loading} />
        </label>
        <label>
          <span>About Mission</span>
          <textarea value={form.aboutMission} onChange={(e) => updateField("aboutMission", e.target.value)} placeholder="Describe the mission and purpose of the platform." disabled={loading} />
        </label>
        <button className="lookup-button" type="submit" disabled={loading || saving || uploading}>
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </form>
    </section>
  );
}
