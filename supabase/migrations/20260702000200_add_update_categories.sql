alter table public.updates
add column if not exists update_category text not null default 'Campaign';

update public.updates
set update_category = case
  when content_label in ('Announcement', 'Campaign', 'Liquidation', 'Fan Project') then content_label
  when content_label = 'Transparency' then 'Liquidation'
  when content_label = 'Past Campaign' then 'Campaign'
  when content_label = 'Latest Update' then 'Campaign'
  else 'Announcement'
end
where update_category is null
  or update_category = ''
  or update_category = 'Campaign';

update public.updates
set update_category = 'Liquidation'
where update_category = 'Transparency';

update public.updates
set update_category = 'Announcement'
where update_category = 'General';

alter table public.updates
drop constraint if exists updates_update_category_check;

alter table public.updates
add constraint updates_update_category_check
check (update_category in ('Announcement', 'Campaign', 'Liquidation', 'Fan Project'));
