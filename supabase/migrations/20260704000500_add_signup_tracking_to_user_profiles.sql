alter table public.user_profiles
add column if not exists signup_ip inet,
add column if not exists signup_user_agent text not null default '',
add column if not exists signup_tracked_at timestamptz;

create index if not exists user_profiles_signup_tracked_at_idx
on public.user_profiles (signup_tracked_at desc);
