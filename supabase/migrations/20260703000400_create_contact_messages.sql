create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  email text not null default '',
  subject text not null default '',
  message text not null default '',
  status text not null default 'Unread' check (status in ('Unread', 'Read', 'Archived')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists contact_messages_status_created_idx
on public.contact_messages (status, created_at desc);

alter table public.contact_messages enable row level security;

drop trigger if exists set_contact_messages_updated_at on public.contact_messages;
create trigger set_contact_messages_updated_at
before update on public.contact_messages
for each row execute procedure public.set_updated_at();

drop policy if exists "sbl public submit contact messages" on public.contact_messages;
drop policy if exists "sbl authenticated manage contact messages" on public.contact_messages;

create policy "sbl public submit contact messages"
on public.contact_messages for insert
to anon, authenticated
with check (true);

create policy "sbl authenticated manage contact messages"
on public.contact_messages for all
to authenticated
using (true)
with check (true);
