create table if not exists public.campaign_milestones (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  title text not null,
  target_amount numeric(12,2) not null default 0 check (target_amount >= 0),
  row_start integer not null default 1 check (row_start > 0),
  row_end integer not null default 1 check (row_end >= row_start),
  status text not null default 'Active' check (status in ('Active', 'Completed', 'Not Achieved')),
  display_order integer not null default 0,
  note text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.campaign_milestones enable row level security;

drop policy if exists "sbl public read campaign milestones" on public.campaign_milestones;
drop policy if exists "sbl authenticated manage campaign milestones" on public.campaign_milestones;

create policy "sbl public read campaign milestones"
on public.campaign_milestones for select
to anon, authenticated
using (true);

create policy "sbl authenticated manage campaign milestones"
on public.campaign_milestones for all
to authenticated
using (true)
with check (true);

drop trigger if exists set_campaign_milestones_updated_at on public.campaign_milestones;
create trigger set_campaign_milestones_updated_at
before update on public.campaign_milestones
for each row execute procedure public.set_updated_at();
