alter table public.user_profiles
add column if not exists username text not null default '';

create unique index if not exists user_profiles_username_unique_idx
on public.user_profiles (lower(username))
where username <> '';

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, display_name, username, email, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', ''),
    lower(coalesce(new.raw_user_meta_data->>'username', '')),
    coalesce(new.email, ''),
    'member',
    'active'
  )
  on conflict (id) do update
  set email = excluded.email,
      display_name = coalesce(nullif(public.user_profiles.display_name, ''), excluded.display_name),
      username = coalesce(nullif(public.user_profiles.username, ''), excluded.username);

  return new;
end;
$$;
