alter table public.updates
add column if not exists show_as_popup boolean not null default false,
add column if not exists popup_image_url text not null default '',
add column if not exists popup_frequency text not null default 'once',
add column if not exists popup_expires_at timestamptz;

alter table public.updates
drop constraint if exists updates_popup_frequency_check;

alter table public.updates
add constraint updates_popup_frequency_check
check (popup_frequency in ('once', 'daily', 'always'));

create index if not exists updates_popup_idx
on public.updates (show_as_popup, popup_expires_at, published_at desc);
