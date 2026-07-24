alter table public.fan_projects
add column if not exists note_text text not null default 'A''TINTION: Share the experience, amplify the campaign, and help more people discover SB19.';

update public.fan_projects
set note_text = 'A''TINTION: Share the experience, amplify the campaign, and help more people discover SB19.'
where note_text is null or note_text = '';
