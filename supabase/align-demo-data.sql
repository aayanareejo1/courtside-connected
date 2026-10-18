-- One-off: align an already-seeded database with the current seed.sql so team names, rosters,
-- matches and courts all match. Run once in the Supabase SQL editor. Deletes only the old TIMU
-- sample matches/results and the nine rosterless teams from the Bugarski Cup feed.
update public.sources set name = 'TIMU.ca (sample results)', config = '{"division":"15U Girls"}'::jsonb where kind = 'timu';

delete from public.results where match_id in (select id from public.matches where source_id = (select id from public.sources where kind = 'timu'));
delete from public.matches where source_id = (select id from public.sources where kind = 'timu');
delete from public.teams where name in ('Pakmen Gold Andrea','Milton Edge Thunder','EVP Eagles Rise','Jr Gryphons Fireballs','MVC Blackcomb','Defensa EC','Niagara Rapids Wild','Hurricanes Category 3 Blue','FCVC Evergreen');

-- Demo schedule for the beach pairs (initials only).
insert into public.matches (event_day_id, division_id, court_id, court_label_raw, start_at, est_duration_min, home_team_id, away_team_id, status, source_id, external_id, pool, time_estimated)
select ed.id, ht.division_id, c.id, 'Court ' || m.court, m.t::timestamptz, 60, ht.id, at.id, m.status, s.id, m.ext, m.pool, m.est
from (values
 ('B-3001','myteam','2026-04-21T14:00:00Z','5','E.E. / J.R.','L.K. / S.M.','scheduled','Pool A',false),
 ('B-3002','myteam','2026-04-21T14:00:00Z','9','N.Z. / L.Z.','M.K. / J.B.','scheduled','Pool A',false),
 ('B-3003','myteam','2026-04-21T14:00:00Z','13','M.P. / R.C.','V.M. / A.U.','scheduled','Pool B',false),
 ('B-3004','myteam','2026-04-21T15:15:00Z','5','M.N. / V.V.','Y.S. / S.V.','scheduled','Pool B',false),
 ('B-3005','myteam','2026-04-21T15:15:00Z','9','I.M. / M.S.','L.M. / J.K.','scheduled','Pool C',false),
 ('B-3006','myteam','2026-04-21T15:15:00Z','13','E.T. / S.B.','H.M. / V.M.','scheduled','Pool C',false)
) m(ext,kind,t,court,home,away,status,pool,est)
join public.sources s on s.kind = m.kind
join public.event_days ed on ed.date = (m.t::timestamptz at time zone 'America/Toronto')::date
join public.courts c on c.label = m.court
join public.teams ht on ht.name = m.home
join public.teams at on at.name = m.away;
-- The next two-minute sync re-creates the 12 TIMU sample matches and results for the rostered teams.
