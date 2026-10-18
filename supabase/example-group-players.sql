-- Additions only. Run on the existing event database as its owner.
-- Example players use the sample Lakeshore team; no jersey is invented for Alyssa.
insert into public.players (team_id, display_name, jersey_number)
select t.id, p.display_name, p.jersey_number
from public.teams t
join public.divisions d on d.id = t.division_id
join public.events e on e.id = d.event_id
cross join (values ('Aayan A.', 16), ('Alyssa M.', null::integer)) p(display_name, jersey_number)
where t.name = 'Lakeshore Storm 13U' and e.published = true
and not exists (
  select 1 from public.players existing
  where existing.team_id = t.id and existing.display_name = p.display_name
);