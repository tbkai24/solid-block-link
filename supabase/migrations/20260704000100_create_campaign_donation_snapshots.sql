create table if not exists public.campaign_donation_snapshots (
  campaign_id uuid primary key references public.campaigns(id) on delete cascade,
  summary jsonb not null default '{}'::jsonb,
  public_amount numeric(12,2) not null default 0 check (public_amount >= 0),
  donor_count integer not null default 0 check (donor_count >= 0),
  fetched_at timestamptz not null default timezone('utc', now()),
  fetch_status text not null default 'success' check (fetch_status in ('success', 'error')),
  error_message text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.campaign_donation_snapshots enable row level security;

drop policy if exists "sbl public read campaign donation snapshots" on public.campaign_donation_snapshots;
drop policy if exists "sbl authenticated manage campaign donation snapshots" on public.campaign_donation_snapshots;

create policy "sbl public read campaign donation snapshots"
on public.campaign_donation_snapshots for select
to anon, authenticated
using (true);

create policy "sbl authenticated manage campaign donation snapshots"
on public.campaign_donation_snapshots for all
to authenticated
using (true)
with check (true);

drop trigger if exists set_campaign_donation_snapshots_updated_at on public.campaign_donation_snapshots;
create trigger set_campaign_donation_snapshots_updated_at
before update on public.campaign_donation_snapshots
for each row execute procedure public.set_updated_at();

create index if not exists campaign_donation_snapshots_fetched_at_idx
on public.campaign_donation_snapshots (fetched_at desc);
