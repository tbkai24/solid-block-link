create table if not exists public.liquidations (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  caption text not null,
  image_url text not null,
  published_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.liquidations enable row level security;

drop policy if exists "sbl public read liquidations" on public.liquidations;
drop policy if exists "sbl authenticated manage liquidations" on public.liquidations;

create policy "sbl public read liquidations"
on public.liquidations for select
to anon, authenticated
using (true);

create policy "sbl authenticated manage liquidations"
on public.liquidations for all
to authenticated
using (true)
with check (true);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_liquidations_updated_at on public.liquidations;
create trigger set_liquidations_updated_at
before update on public.liquidations
for each row execute procedure public.set_updated_at();
