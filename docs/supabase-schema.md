# Supabase Schema Plan

## Tables

### `site_settings`
- `id uuid primary key`
- `hero_title text`
- `hero_summary text`
- `donate_cta_label text`
- `donate_cta_url text`
- `lookup_cta_label text`
- `lookup_cta_url text`
- `logo_url text`
- `about_title text`
- `about_intro text`
- `about_story text`
- `about_mission text`
- `footer_title text`
- `footer_summary text`

### `campaigns`
- `id uuid primary key`
- `title text`
- `summary text`
- `status text`
- `outcome text`
- `goal_amount numeric`
- `internal_amount numeric`
  Derived from internal adjustment records for fast homepage reads
- `public_amount numeric`
- `donor_count integer`
- `last_updated timestamptz`
- `featured boolean`
- `is_past boolean`

### `campaign_internal_adjustments`
- `id uuid primary key`
- `campaign_id uuid references campaigns.id`
- `label text`
- `amount numeric`
- `notes text`
- `added_at timestamptz`
- `created_by uuid`
- `created_at timestamptz`
- `updated_at timestamptz`

### `updates`
- `id uuid primary key`
- `title text`
- `summary text`
- `published_at timestamptz`
- `href text`
- `featured boolean`

### `embeds`
- `id uuid primary key`
- `title text`
- `platform text`
- `embed_note text`
- `embed_url text`
- `featured boolean`
- `display_order integer`

## Migration file

- `supabase/migrations/20260319000100_create_sbl_core_tables.sql`

## Recommended admin flow

- `site_settings` stores homepage CTA text and links
- `site_settings` also stores editable About page and footer copy
- `campaigns` stores the active campaign plus past campaigns
- `updates` stores manually curated homepage cards
- `embeds` stores selected SBL post embeds instead of auto-importing everything
- `campaign_internal_adjustments` stores the admin history behind internal donation totals

## Donation logic

- Public donation totals can still come from Apps Script or a synced table
- Admin adds internal donations as adjustment rows
- Triggers auto-sum those rows back into `campaigns.internal_amount`
- Frontend reads merged campaign totals from one content service
