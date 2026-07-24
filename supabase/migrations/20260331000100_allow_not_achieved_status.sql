do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.campaigns'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%status%';

  if constraint_name is not null then
    execute format('alter table public.campaigns drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.campaigns
add constraint campaigns_status_check
check (status in ('Active', 'Completed', 'Not Achieved'));

do $$
declare
  constraint_name text;
begin
  if to_regclass('public.campaign_milestones') is null then
    return;
  end if;

  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.campaign_milestones'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%status%';

  if constraint_name is not null then
    execute format('alter table public.campaign_milestones drop constraint %I', constraint_name);
  end if;

  alter table public.campaign_milestones
  add constraint campaign_milestones_status_check
  check (status in ('Active', 'Completed', 'Not Achieved'));
end $$;
