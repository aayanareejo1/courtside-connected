-- Simplified venue guide: extra labelled places for the map.
-- Additions only. Safe to run more than once: each row is added only if an area with that name is not already there.
-- Positions are percentages of the plan (x, y = top left; w, h = size). Edit them later in the areas table.
insert into public.areas (venue_id, name, kind, x, y, w, h)
select v.id, a.name, a.kind, a.x, a.y, a.w, a.h
from public.venues v
cross join (values
  ('Registration desk', 'other', 26, 65, 24, 12),
  ('Food court',        'other', 26, 80, 12, 13),
  ('Main entrance',     'other', 40, 80, 10, 13),
  ('Washrooms',         'other', 82, 65, 16, 13),
  ('Side entrance',     'other', 82, 80, 16, 13)
) as a(name, kind, x, y, w, h)
where not exists (select 1 from public.areas e where e.venue_id = v.id and e.name = a.name);

-- Optional floor plan background. Put the image in the app's public folder (for example /floor-plan.png)
-- or use a full https link, then uncomment and run:
-- update public.venues set floor_plan_path = '/floor-plan.png';
