create extension if not exists pgcrypto;

create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  hero_title text not null,
  hero_summary text not null,
  donate_cta_label text not null default 'Donate Now',
  donate_cta_url text not null,
  lookup_cta_label text not null default 'SBL Lookup',
  lookup_cta_url text not null,
  logo_url text not null default '',
  about_title text not null default 'About Solid Block Link',
  about_intro text not null default '',
  about_story text not null default '',
  about_mission text not null default '',
  footer_title text not null default 'Connect with Solid Block Link',
  footer_summary text not null default 'Fan-powered marketing and donation campaigns helping promote SB19 worldwide.',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  status text not null check (status in ('Active', 'Completed')),
  outcome text not null,
  goal_amount numeric(12,2) not null default 0,
  internal_amount numeric(12,2) not null default 0,
  public_amount numeric(12,2) not null default 0,
  donor_count integer not null default 0,
  last_updated timestamptz not null default timezone('utc', now()),
  featured boolean not null default false,
  is_past boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.updates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  published_at timestamptz not null default timezone('utc', now()),
  href text not null default '/updates',
  featured boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.embeds (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  platform text not null,
  embed_note text not null default '',
  embed_url text not null,
  featured boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.campaign_internal_adjustments (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  label text not null,
  amount numeric(12,2) not null check (amount >= 0),
  notes text not null default '',
  added_at timestamptz not null default timezone('utc', now()),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.site_settings enable row level security;
alter table public.campaigns enable row level security;
alter table public.updates enable row level security;
alter table public.embeds enable row level security;
alter table public.campaign_internal_adjustments enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.sync_campaign_internal_amount()
returns trigger
language plpgsql
as $$
declare
  target_campaign_id uuid;
begin
  target_campaign_id := coalesce(new.campaign_id, old.campaign_id);

  update public.campaigns
  set internal_amount = coalesce((
    select sum(amount)
    from public.campaign_internal_adjustments
    where campaign_id = target_campaign_id
  ), 0)
  where id = target_campaign_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists set_site_settings_updated_at on public.site_settings;
create trigger set_site_settings_updated_at
before update on public.site_settings
for each row execute procedure public.set_updated_at();

drop trigger if exists set_campaigns_updated_at on public.campaigns;
create trigger set_campaigns_updated_at
before update on public.campaigns
for each row execute procedure public.set_updated_at();

drop trigger if exists set_updates_updated_at on public.updates;
create trigger set_updates_updated_at
before update on public.updates
for each row execute procedure public.set_updated_at();

drop trigger if exists set_embeds_updated_at on public.embeds;
create trigger set_embeds_updated_at
before update on public.embeds
for each row execute procedure public.set_updated_at();

drop trigger if exists set_campaign_internal_adjustments_updated_at on public.campaign_internal_adjustments;
create trigger set_campaign_internal_adjustments_updated_at
before update on public.campaign_internal_adjustments
for each row execute procedure public.set_updated_at();

drop trigger if exists sync_campaign_internal_amount_after_insert on public.campaign_internal_adjustments;
create trigger sync_campaign_internal_amount_after_insert
after insert on public.campaign_internal_adjustments
for each row execute procedure public.sync_campaign_internal_amount();

drop trigger if exists sync_campaign_internal_amount_after_update on public.campaign_internal_adjustments;
create trigger sync_campaign_internal_amount_after_update
after update on public.campaign_internal_adjustments
for each row execute procedure public.sync_campaign_internal_amount();

drop trigger if exists sync_campaign_internal_amount_after_delete on public.campaign_internal_adjustments;
create trigger sync_campaign_internal_amount_after_delete
after delete on public.campaign_internal_adjustments
for each row execute procedure public.sync_campaign_internal_amount();

drop policy if exists "public read site settings" on public.site_settings;
drop policy if exists "sbl public read site settings" on public.site_settings;
drop policy if exists "public read campaigns" on public.campaigns;
drop policy if exists "sbl public read campaigns" on public.campaigns;
drop policy if exists "public read updates" on public.updates;
drop policy if exists "sbl public read updates" on public.updates;
drop policy if exists "public read embeds" on public.embeds;
drop policy if exists "sbl public read embeds" on public.embeds;
drop policy if exists "public read campaign internal adjustments" on public.campaign_internal_adjustments;
drop policy if exists "sbl authenticated read campaign internal adjustments" on public.campaign_internal_adjustments;

drop policy if exists "authenticated manage site settings" on public.site_settings;
drop policy if exists "sbl authenticated manage site settings" on public.site_settings;
drop policy if exists "authenticated manage campaigns" on public.campaigns;
drop policy if exists "sbl authenticated manage campaigns" on public.campaigns;
drop policy if exists "authenticated manage updates" on public.updates;
drop policy if exists "sbl authenticated manage updates" on public.updates;
drop policy if exists "authenticated manage embeds" on public.embeds;
drop policy if exists "sbl authenticated manage embeds" on public.embeds;
drop policy if exists "authenticated manage campaign internal adjustments" on public.campaign_internal_adjustments;
drop policy if exists "sbl authenticated manage campaign internal adjustments" on public.campaign_internal_adjustments;

create policy "sbl public read site settings"
on public.site_settings for select
to anon, authenticated
using (true);

create policy "sbl public read campaigns"
on public.campaigns for select
to anon, authenticated
using (true);

create policy "sbl public read updates"
on public.updates for select
to anon, authenticated
using (true);

create policy "sbl public read embeds"
on public.embeds for select
to anon, authenticated
using (true);

create policy "sbl authenticated read campaign internal adjustments"
on public.campaign_internal_adjustments for select
to authenticated
using (true);

create policy "sbl authenticated manage site settings"
on public.site_settings for all
to authenticated
using (true)
with check (true);

create policy "sbl authenticated manage campaigns"
on public.campaigns for all
to authenticated
using (true)
with check (true);

create policy "sbl authenticated manage updates"
on public.updates for all
to authenticated
using (true)
with check (true);

create policy "sbl authenticated manage embeds"
on public.embeds for all
to authenticated
using (true)
with check (true);

create policy "sbl authenticated manage campaign internal adjustments"
on public.campaign_internal_adjustments for all
to authenticated
using (true)
with check (true);
