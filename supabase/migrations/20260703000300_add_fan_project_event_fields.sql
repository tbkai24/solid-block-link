alter table public.fan_projects
  add column if not exists event_date date,
  add column if not exists event_time time,
  add column if not exists event_timezone text,
  add column if not exists event_location text;
