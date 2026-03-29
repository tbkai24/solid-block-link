export type SiteSettingsRow = {
  hero_title: string;
  hero_summary: string;
  donate_cta_label: string;
  donate_cta_url: string;
  lookup_cta_label: string;
  lookup_cta_url: string;
  logo_url: string;
  about_title: string;
  about_intro_title: string;
  about_intro: string;
  about_story_title: string;
  about_story: string;
  about_mission_title: string;
  about_mission: string;
  milestone_title: string;
  milestone_description: string;
  show_milestone_on_homepage: boolean;
  milestone_step_amount: number;
  footer_title: string;
  footer_summary: string;
};

export type CampaignRow = {
  id: string;
  title: string;
  summary: string;
  status: "Active" | "Completed";
  outcome: string;
  donate_url: string;
  sheet_name: string;
  homepage_order: number;
  goal_amount: number;
  internal_amount: number;
  public_amount: number;
  donor_count: number;
  last_updated: string;
  featured: boolean;
  is_past: boolean;
};

export type CampaignMilestoneRow = {
  id: string;
  campaign_id: string;
  title: string;
  target_amount: number;
  row_start: number;
  row_end: number;
  status: "Active" | "Completed";
  display_order: number;
  note: string;
  created_at: string;
  updated_at: string;
};

export type UpdateRow = {
  id: string;
  title: string;
  summary: string;
  content_label: string;
  platform: string;
  published_at: string;
  href: string;
  featured: boolean;
};

export type InternalAdjustmentRow = {
  id: string;
  campaign_id: string;
  milestone_id?: string | null;
  name: string;
  amount: number;
  notes: string;
  added_at: string;
};

export type EmbedRow = {
  id: string;
  title: string;
  platform: string;
  embed_note: string;
  embed_url: string;
  featured: boolean;
  display_order: number;
};
