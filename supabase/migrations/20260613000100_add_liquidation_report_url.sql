alter table public.liquidations
add column if not exists report_url text not null default '';
