create or replace function public.get_internal_donor_counts(campaign_ids uuid[])
returns table (
  campaign_id uuid,
  donor_count integer
)
language sql
security definer
set search_path = public
as $$
  select
    cia.campaign_id,
    count(*)::integer as donor_count
  from public.campaign_internal_adjustments cia
  where cia.campaign_id = any(campaign_ids)
  group by cia.campaign_id;
$$;

revoke all on function public.get_internal_donor_counts(uuid[]) from public;
grant execute on function public.get_internal_donor_counts(uuid[]) to anon, authenticated;
