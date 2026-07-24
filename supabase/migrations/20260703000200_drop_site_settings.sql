drop policy if exists "public read site settings" on public.site_settings;
drop policy if exists "sbl public read site settings" on public.site_settings;
drop policy if exists "authenticated manage site settings" on public.site_settings;
drop policy if exists "sbl authenticated manage site settings" on public.site_settings;

drop trigger if exists set_site_settings_updated_at on public.site_settings;

drop table if exists public.site_settings;
