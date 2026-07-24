create table if not exists public.fan_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'Promotional Campaign',
  region text not null default 'Global',
  added_by text not null default 'Solid Block Link',
  description text not null default '',
  image_url text not null default '',
  status text not null default 'Upcoming' check (status in ('Active', 'Completed', 'Upcoming')),
  visibility text not null default 'public' check (visibility in ('public', 'private', 'reveal-soon')),
  teaser_text text not null default '',
  note_text text not null default 'A''TINTION: Share the experience, amplify the campaign, and help more people discover SB19.',
  related_link text not null default '',
  display_order integer not null default 0,
  featured boolean not null default true,
  published_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists fan_projects_public_idx
on public.fan_projects (featured, visibility, display_order, published_at desc);

alter table public.fan_projects enable row level security;

drop trigger if exists set_fan_projects_updated_at on public.fan_projects;
create trigger set_fan_projects_updated_at
before update on public.fan_projects
for each row execute procedure public.set_updated_at();

drop policy if exists "sbl public read visible fan projects" on public.fan_projects;
drop policy if exists "sbl authenticated manage fan projects" on public.fan_projects;

create policy "sbl public read visible fan projects"
on public.fan_projects for select
to anon, authenticated
using (featured = true and visibility in ('public', 'reveal-soon'));

create policy "sbl authenticated manage fan projects"
on public.fan_projects for all
to authenticated
using (true)
with check (true);

insert into storage.buckets (id, name, public)
values ('sbl-assets', 'sbl-assets', true)
on conflict (id) do update
set public = true;

drop policy if exists "sbl public read assets" on storage.objects;
drop policy if exists "sbl authenticated upload assets" on storage.objects;
drop policy if exists "sbl authenticated update assets" on storage.objects;
drop policy if exists "sbl authenticated delete assets" on storage.objects;

create policy "sbl public read assets"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'sbl-assets');

create policy "sbl authenticated upload assets"
on storage.objects for insert
to authenticated
with check (bucket_id = 'sbl-assets');

create policy "sbl authenticated update assets"
on storage.objects for update
to authenticated
using (bucket_id = 'sbl-assets')
with check (bucket_id = 'sbl-assets');

create policy "sbl authenticated delete assets"
on storage.objects for delete
to authenticated
using (bucket_id = 'sbl-assets');
