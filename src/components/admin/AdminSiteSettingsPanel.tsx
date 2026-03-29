import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useAdminAlert } from "../../hooks/useAdminAlert";
import { invalidateSiteContentCache } from "../../services/siteContentCache";
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
      invalidateSiteContentCache();
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
          <input value={form.heroTitle} onChange={(e) => updateField("heroTitle", e.target.value)} placeholder="Power the Global Rise of SB19" disabled={saving} />
        </label>
        <label>
          <span>Hero Summary</span>
          <textarea value={form.heroSummary} onChange={(e) => updateField("heroSummary", e.target.value)} placeholder="Short supporting copy for the homepage hero section." disabled={saving} />
        </label>
        <label>
          <span>Lookup CTA URL</span>
          <input value={form.lookupCtaUrl} onChange={(e) => updateField("lookupCtaUrl", e.target.value)} placeholder="https://sbl-donation-lookup.vercel.app/" disabled={saving} />
        </label>
        <label>
          <span>Logo Upload</span>
          <input type="file" accept="image/*" onChange={handleUpload} disabled={saving || uploading} />
        </label>
        <p className="muted-text">Uses Supabase Storage bucket: <strong>sbl-assets</strong></p>
        {form.logoUrl ? <img className="admin-logo-preview" src={form.logoUrl} alt="Logo preview" /> : null}
        <label>
          <span>About Title</span>
          <input value={form.aboutTitle} onChange={(e) => updateField("aboutTitle", e.target.value)} placeholder="About Solid Block Link" disabled={saving} />
        </label>
        <label>
          <span>About Intro Title</span>
          <input value={form.aboutIntroTitle} onChange={(e) => updateField("aboutIntroTitle", e.target.value)} placeholder="Introduction" disabled={saving} />
        </label>
        <label>
          <span>About Intro</span>
          <textarea value={form.aboutIntro} onChange={(e) => updateField("aboutIntro", e.target.value)} placeholder="Short introduction for the About page." disabled={saving} />
        </label>
        <label>
          <span>About Story Title</span>
          <input value={form.aboutStoryTitle} onChange={(e) => updateField("aboutStoryTitle", e.target.value)} placeholder="Story" disabled={saving} />
        </label>
        <label>
          <span>About Story</span>
          <textarea value={form.aboutStory} onChange={(e) => updateField("aboutStory", e.target.value)} placeholder="Tell the Solid Block Link story here." disabled={saving} />
        </label>
        <label>
          <span>About Mission Title</span>
          <input value={form.aboutMissionTitle} onChange={(e) => updateField("aboutMissionTitle", e.target.value)} placeholder="Mission" disabled={saving} />
        </label>
        <label>
          <span>About Mission</span>
          <textarea value={form.aboutMission} onChange={(e) => updateField("aboutMission", e.target.value)} placeholder="Describe the mission and purpose of the platform." disabled={saving} />
        </label>
        <button className="lookup-button" type="submit" disabled={saving || uploading}>
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </form>
    </section>
  );
}

export default AdminSiteSettingsPanel;
