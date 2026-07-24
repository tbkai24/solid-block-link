export type CampaignRow = {
  id: string;
  title: string;
  summary: string;
  status: "Active" | "Completed" | "Not Achieved";
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
  status: "Active" | "Completed" | "Not Achieved";
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
  update_category?: string;
  platform: string;
  published_at: string;
  href: string;
  featured: boolean;
  show_as_popup?: boolean;
  popup_image_url?: string;
  popup_frequency?: "once" | "daily" | "always";
  popup_expires_at?: string | null;
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

export type LiquidationRow = {
  id: string;
  title: string;
  caption: string;
  image_url: string;
  report_url: string;
  published_at: string;
  created_at: string;
  updated_at: string;
};

export type FanProjectRow = {
  id: string;
  title: string;
  category: string;
  region: string;
  added_by: string;
  description: string;
  image_url: string;
  event_date: string | null;
  event_time: string | null;
  event_timezone: string | null;
  event_location: string | null;
  status: "Active" | "Completed" | "Upcoming";
  visibility: "public" | "private" | "reveal-soon";
  teaser_text: string;
  note_text: string;
  related_link: string;
  display_order: number;
  featured: boolean;
  published_at: string;
  created_at: string;
  updated_at: string;
};

export type ContactMessageRow = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "Unread" | "Read" | "Archived";
  created_at: string;
  updated_at: string;
};

export type UserProfileRow = {
  id: string;
  display_name: string;
  username: string;
  email: string;
  role: "admin" | "member";
  status: "active" | "pending" | "disabled";
  signup_ip?: string | null;
  signup_user_agent?: string | null;
  signup_tracked_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type SupportTicketRow = {
  id: string;
  ticket_number?: number | null;
  user_id: string;
  subject: string;
  category: "General" | "Donation" | "Fan Project" | "Campaign" | "Technical";
  status: "Pending" | "Open" | "Closed";
  priority: "Normal" | "Urgent";
  created_at: string;
  updated_at: string;
  user_profiles?: Pick<UserProfileRow, "display_name" | "username" | "email"> | null;
  support_ticket_messages?: SupportTicketMessageRow[];
};

export type SupportTicketMessageRow = {
  id: string;
  ticket_id: string;
  sender_user_id: string;
  sender_role: "admin" | "member";
  body: string;
  created_at: string;
};
