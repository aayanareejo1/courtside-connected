-- Gives Ask Courtside a tickets link to hand out. Additions only, no deletes. Run in Supabase > SQL Editor.
-- OVA has not supplied a ticketing vendor, so this points to the official event page.
-- When a vendor link exists, edit the url in the app's info links. Write {qty} where the number of tickets belongs
-- (for example https://vendor.example/event?qty={qty}) and Ask Courtside fills it in from the fan's question.
insert into public.info_links (event_id, category, title, url, description, sort, published)
select e.id, 'tickets', 'Tickets and admission info', 'https://www.ontariovolleyball.org/ontario-championships',
       'Official OVA event page for admission and ticket details.', 0, true
from public.events e
where e.published
  and not exists (select 1 from public.info_links l where l.event_id = e.id and l.category = 'tickets');
