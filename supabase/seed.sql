-- Courtside Connected demo content, copied from the Lovable app's published data on 2026-10-17.
-- Run after supabase/setup.sql. Player names are already reduced to first name + last initial
-- (players are minors). Beach pairs are initials only. Other team rosters are fictional.
-- Matches and results here are the last synced snapshot; the scheduled sync refreshes them.

-- Sources: last_status starts at 'never' so nothing claims to be live before a real sync runs.
insert into public.sources (kind, name, config) values
 ('manual','Manual entry','{}'),
 ('aes','AES (event check, mock statuses)','{"event_key":"MjAyNl9PbnRhcmlvX0NoYW1waW9uc2hpcHNfX19FdmVudF8yX182djZHX19UTFNHX18xNVVCXw2"}'),
 ('speer','Speer rosters (mock CSV)','{}'),
 ('myteam','MyTeam.click (snapshot)','{}'),
 ('timu','TIMU.ca (sample tournament tid 3960)','{"division":"15U Girls","live_tid":"3960","court_map":{"1":"5","2":"9","3":"13"},"event_date":"2026-04-19"}');

insert into public.venues (name, address, plan_width, plan_height)
values ('Enercare Centre', '100 Princes'' Blvd, Toronto, ON M6K 3C3', 1000, 330);

insert into public.areas (venue_id, name, kind, x, y, w, h)
select v.id, a.name, a.kind, a.x, a.y, a.w, a.h from public.venues v, (values
 ('Hall 1','hall',2,3,46,55),('Hall 2','hall',52,3,46,55),
 ('Meeting Room A','meeting',2,65,22,28),('Hall 2 warm up','warmup',52,65,28,28)
) a(name,kind,x,y,w,h);

insert into public.courts (venue_id, area_id, label, number, map_x, map_y, stream_url)
select v.id, ar.id, c.label, c.num, c.x, 33, c.stream from public.venues v
join (values
 ('5',5,'Hall 1',10,'https://stream.example.com/court-5'),
 ('9',9,'Hall 1',25,null),
 ('13',13,'Hall 1',40,null),
 ('17',17,'Hall 2',60,'https://stream.example.com/court-17'),
 ('20',20,'Hall 2',75,null),
 ('23',23,'Hall 2',90,null)
) c(label,num,area,x,stream) on true
join public.areas ar on ar.venue_id = v.id and ar.name = c.area;

insert into public.events (name, slug, starts_on, ends_on, venue_id, warmup_min, walk_min, published, registration_url, registration_live)
select '2026 Ontario Championships – Event 2', 'ontario-championships-2026-event-2', '2026-04-19', '2026-04-21', id, 10, 5, true, 'https://www.ontariovolleyball.org/', false
from public.venues;

insert into public.event_days (event_id, date, label)
select e.id, d.date::date, d.label from public.events e,
 (values ('2026-04-19','Sunday'),('2026-04-20','Monday'),('2026-04-21','Tuesday')) d(date,label);

insert into public.divisions (event_id, name, age_group, gender, default_match_min)
select e.id, d.name, '15U' , 'Girls', 60 from public.events e, (values ('15U Girls'),('15U Girls Premier (beach)')) d(name)
union all select e.id, '13U Girls', '13U', 'Girls', 60 from public.events e;

-- Which source feeds each day and division.
insert into public.day_division_sources (event_day_id, division_id, source_id)
select ed.id, dv.id, s.id from (values
 ('2026-04-19','15U Girls','timu'),('2026-04-19','13U Girls','timu'),
 ('2026-04-20','15U Girls','aes'),('2026-04-20','13U Girls','aes'),
 ('2026-04-21','15U Girls','aes'),('2026-04-21','13U Girls','aes'),
 ('2026-04-21','15U Girls Premier (beach)','myteam')
) x(day,div,kind)
join public.event_days ed on ed.date = x.day::date
join public.divisions dv on dv.name = x.div
join public.sources s on s.kind = x.kind;

insert into public.clubs (name, city) values
 ('Lakeshore Storm','Mississauga'),('Ottawa Peaks','Ottawa'),('Hamilton Harbour VC','Hamilton'),
 ('London Lightning','London'),('Kingston Tide','Kingston'),('Toronto Skyline Volleyball Club','Toronto');

-- Indoor teams (fictional except Toronto Skyline 15U Blue, from the OVA sample roster).
insert into public.teams (club_id, division_id, name)
select c.id, d.id, t.team from (values
 ('Toronto Skyline Volleyball Club','13U Girls','Toronto Skyline 13U White'),
 ('Toronto Skyline Volleyball Club','15U Girls','Toronto Skyline 15U Blue'),
 ('Lakeshore Storm','13U Girls','Lakeshore Storm 13U'),
 ('Ottawa Peaks','13U Girls','Ottawa Peaks 13U Blue'),
 ('Ottawa Peaks','15U Girls','Ottawa Peaks 15U Red'),
 ('Hamilton Harbour VC','15U Girls','Hamilton Harbour 15U'),
 ('London Lightning','15U Girls','London Lightning 15U Gold'),
 ('Kingston Tide','13U Girls','Kingston Tide 13U')
) t(club,div,team)
join public.clubs c on c.name = t.club join public.divisions d on d.name = t.div;

-- Teams from the TIMU sample tournament (no club records in the source).
insert into public.teams (division_id, name)
select d.id, t.name from public.divisions d, (values
 ('Pakmen Gold Andrea'),('Milton Edge Thunder'),('EVP Eagles Rise'),('Jr Gryphons Fireballs'),('MVC Blackcomb'),
 ('Defensa EC'),('Niagara Rapids Wild'),('Hurricanes Category 3 Blue'),('FCVC Evergreen')
) t(name) where d.name = '15U Girls';

-- Beach pairs from the MyTeam.click snapshot: initials only.
insert into public.teams (division_id, name, external_refs)
select d.id, t.name, '{"pool":"","source":"myteam.click"}'::jsonb from public.divisions d, (values
 ('E.E. / J.R.'),('L.K. / S.M.'),('N.Z. / L.Z.'),('M.K. / J.B.'),('M.P. / R.C.'),('V.M. / A.U.'),
 ('M.N. / V.V.'),('Y.S. / S.V.'),('I.M. / M.S.'),('L.M. / J.K.'),('E.T. / S.B.'),('H.M. / V.M.')
) t(name) where d.name = '15U Girls Premier (beach)';

insert into public.players (team_id, display_name, jersey_number)
select t.id, p.n, p.j from (values
 ('Toronto Skyline 15U Blue','Olivia C.',1),('Toronto Skyline 15U Blue','Maya P.',2),('Toronto Skyline 15U Blue','Emma R.',3),
 ('Toronto Skyline 15U Blue','Hannah K.',4),('Toronto Skyline 15U Blue','Amara J.',5),('Toronto Skyline 15U Blue','Sophie D.',6),
 ('Toronto Skyline 15U Blue','Zara K.',7),('Toronto Skyline 15U Blue','Lily N.',8),('Toronto Skyline 15U Blue','Ava M.',9),
 ('Toronto Skyline 15U Blue','Naomi W.',10),('Toronto Skyline 15U Blue','Isabella F.',11),('Toronto Skyline 15U Blue','Chloe B.',12),
 ('Kingston Tide 13U','Sienna P.',3),('Kingston Tide 13U','Zara C.',2),('Kingston Tide 13U','Emma H.',4),('Kingston Tide 13U','Nora B.',5),
 ('Kingston Tide 13U','Maya W.',10),('Kingston Tide 13U','Maya T.',11),('Kingston Tide 13U','Naomi W.',12),('Kingston Tide 13U','Chloe P.',13),
 ('Kingston Tide 13U','Maya W.',18),('Kingston Tide 13U','Jasmine C.',21),
 ('Ottawa Peaks 13U Blue','Aisha V.',4),('Ottawa Peaks 13U Blue','Isla G.',6),('Ottawa Peaks 13U Blue','Mila R.',7),('Ottawa Peaks 13U Blue','Tessa H.',9),
 ('Ottawa Peaks 13U Blue','Grace K.',12),('Ottawa Peaks 13U Blue','Tessa C.',18),('Ottawa Peaks 13U Blue','Jasmine L.',19),('Ottawa Peaks 13U Blue','Lily W.',20),
 ('Ottawa Peaks 13U Blue','Zara F.',21),('Ottawa Peaks 13U Blue','Olivia B.',22),
 ('Toronto Skyline 13U White','Olivia L.',3),('Toronto Skyline 13U White','Ella M.',4),('Toronto Skyline 13U White','Ruby C.',10),('Toronto Skyline 13U White','Sofia S.',11),
 ('Toronto Skyline 13U White','Olivia R.',14),('Toronto Skyline 13U White','Jasmine B.',15),('Toronto Skyline 13U White','Brooke L.',16),('Toronto Skyline 13U White','Isla S.',17),
 ('Toronto Skyline 13U White','Chloe C.',19),('Toronto Skyline 13U White','Brooke V.',20),
 ('Hamilton Harbour 15U','Sienna J.',1),('Hamilton Harbour 15U','Harper E.',8),('Hamilton Harbour 15U','Aisha B.',10),('Hamilton Harbour 15U','Lily N.',12),
 ('Hamilton Harbour 15U','Chloe F.',13),('Hamilton Harbour 15U','Amara N.',15),('Hamilton Harbour 15U','Sofia H.',19),('Hamilton Harbour 15U','Nora K.',21),
 ('Hamilton Harbour 15U','Mila S.',22),('Hamilton Harbour 15U','Isla D.',23),('Hamilton Harbour 15U','Grace F.',24),
 ('London Lightning 15U Gold','Isla W.',3),('London Lightning 15U Gold','Isla B.',4),('London Lightning 15U Gold','Sienna M.',5),('London Lightning 15U Gold','Ella E.',6),
 ('London Lightning 15U Gold','Sofia P.',8),('London Lightning 15U Gold','Lily V.',11),('London Lightning 15U Gold','Leah J.',12),('London Lightning 15U Gold','Hannah A.',13),
 ('London Lightning 15U Gold','Aisha W.',14),('London Lightning 15U Gold','Tessa T.',19),('London Lightning 15U Gold','Zara A.',23),
 ('Ottawa Peaks 15U Red','Emma M.',2),('Ottawa Peaks 15U Red','Chloe G.',3),('Ottawa Peaks 15U Red','Ella Y.',4),('Ottawa Peaks 15U Red','Isla A.',7),
 ('Ottawa Peaks 15U Red','Sofia V.',13),('Ottawa Peaks 15U Red','Sofia J.',15),('Ottawa Peaks 15U Red','Maya D.',16),('Ottawa Peaks 15U Red','Grace Y.',18),
 ('Ottawa Peaks 15U Red','Isla N.',19),('Ottawa Peaks 15U Red','Grace S.',20),('Ottawa Peaks 15U Red','Ava W.',21),
 ('Lakeshore Storm 13U','Ava B.',2),('Lakeshore Storm 13U','Maya C.',4),('Lakeshore Storm 13U','Chloe D.',6),('Lakeshore Storm 13U','Priya E.',7),
 ('Lakeshore Storm 13U','Leah F.',9),('Lakeshore Storm 13U','Nora G.',10),('Lakeshore Storm 13U','Zara H.',11),('Lakeshore Storm 13U','Hannah I.',12),
 ('Lakeshore Storm 13U','Ella J.',14),('Lakeshore Storm 13U','Grace K.',15)
) p(team,n,j) join public.teams t on t.name = p.team;

insert into public.staff_members (team_id, display_name, role)
select t.id, s.n, s.r from (values
 ('Toronto Skyline 15U Blue','Coach Carla M.','Head Coach'),('Toronto Skyline 15U Blue','Coach Kevin T.','Assistant Coach'),
 ('Kingston Tide 13U','Coach Wendy B.','Head Coach'),('Kingston Tide 13U','Coach Rita H.','Assistant Coach'),
 ('Ottawa Peaks 13U Blue','Coach Marc K.','Head Coach'),('Ottawa Peaks 13U Blue','Coach Wendy T.','Assistant Coach'),
 ('Toronto Skyline 13U White','Coach Lena C.','Head Coach'),('Toronto Skyline 13U White','Coach Sam B.','Assistant Coach'),
 ('Hamilton Harbour 15U','Coach Iris V.','Head Coach'),('Hamilton Harbour 15U','Coach Rita J.','Assistant Coach'),
 ('London Lightning 15U Gold','Coach Rita N.','Head Coach'),('London Lightning 15U Gold','Coach Iris N.','Assistant Coach'),
 ('Ottawa Peaks 15U Red','Coach Marc S.','Head Coach'),('Ottawa Peaks 15U Red','Coach Iris R.','Assistant Coach'),
 ('Lakeshore Storm 13U','Coach Tom W.','Head Coach'),('Lakeshore Storm 13U','Coach Marc K.','Assistant Coach')
) s(team,n,r) join public.teams t on t.name = s.team;

-- Matches: start times are UTC (Toronto is UTC-4 in April). TIMU rows are estimated round times.
insert into public.matches (event_day_id, division_id, court_id, court_label_raw, start_at, est_duration_min, home_team_id, away_team_id, status, source_id, external_id, pool, time_estimated)
select ed.id, ht.division_id, c.id, 'Court ' || m.court, m.t::timestamptz, 60, ht.id, at.id, m.status, s.id, m.ext, m.pool, m.est
from (values
 ('A-2001','aes','2026-04-20T13:30:00Z','5','Toronto Skyline 15U Blue','London Lightning 15U Gold','scheduled',null,false),
 ('A-2002','aes','2026-04-20T13:30:00Z','9','Ottawa Peaks 15U Red','Hamilton Harbour 15U','scheduled',null,false),
 ('A-2003','aes','2026-04-20T14:45:00Z','23','Lakeshore Storm 13U','Ottawa Peaks 13U Blue','scheduled',null,false),
 ('A-2004','aes','2026-04-20T16:00:00Z','13','Toronto Skyline 15U Blue','Ottawa Peaks 15U Red','scheduled',null,false),
 ('A-2005','aes','2026-04-20T17:30:00Z','17','Kingston Tide 13U','Toronto Skyline 13U White','scheduled',null,false),
 ('A-2006','aes','2026-04-20T18:30:00Z','20','Lakeshore Storm 13U','Kingston Tide 13U','scheduled',null,false),
 ('timu-1000','timu','2026-04-19T13:00:00Z','5','Pakmen Gold Andrea','Milton Edge Thunder','final','Pool A',true),
 ('timu-1001','timu','2026-04-19T13:00:00Z','9','EVP Eagles Rise','Jr Gryphons Fireballs','final','Pool B',true),
 ('timu-1002','timu','2026-04-19T13:00:00Z','13','MVC Blackcomb','Defensa EC','final','Pool C',true),
 ('timu-1003','timu','2026-04-19T14:00:00Z','5','Niagara Rapids Wild','Milton Edge Thunder','final','Pool A',true),
 ('timu-1004','timu','2026-04-19T14:00:00Z','9','Hurricanes Category 3 Blue','Jr Gryphons Fireballs','final','Pool B',true),
 ('timu-1005','timu','2026-04-19T14:00:00Z','13','FCVC Evergreen','Defensa EC','final','Pool C',true),
 ('timu-1006','timu','2026-04-19T15:00:00Z','5','Pakmen Gold Andrea','Niagara Rapids Wild','final','Pool A',true),
 ('timu-1007','timu','2026-04-19T15:00:00Z','9','EVP Eagles Rise','Hurricanes Category 3 Blue','final','Pool B',true),
 ('timu-1008','timu','2026-04-19T15:00:00Z','13','MVC Blackcomb','FCVC Evergreen','final','Pool C',true),
 ('timu-1009','timu','2026-04-19T16:00:00Z','5','EVP Eagles Rise','Niagara Rapids Wild','final',null,true),
 ('timu-1010','timu','2026-04-19T16:00:00Z','9','MVC Blackcomb','Hurricanes Category 3 Blue','final',null,true),
 ('timu-1011','timu','2026-04-19T16:00:00Z','13','Jr Gryphons Fireballs','Defensa EC','final',null,true),
 ('timu-1012','timu','2026-04-19T17:00:00Z','5','Pakmen Gold Andrea','Jr Gryphons Fireballs','final',null,true),
 ('timu-1013','timu','2026-04-19T17:00:00Z','9','FCVC Evergreen','Milton Edge Thunder','final',null,true),
 ('timu-1014','timu','2026-04-19T17:00:00Z','13','Niagara Rapids Wild','Defensa EC','final',null,true),
 ('timu-1015','timu','2026-04-19T18:00:00Z','5','MVC Blackcomb','Pakmen Gold Andrea','final',null,true),
 ('timu-1016','timu','2026-04-19T18:00:00Z','9','EVP Eagles Rise','FCVC Evergreen','final',null,true),
 ('timu-1017','timu','2026-04-19T18:00:00Z','13','Hurricanes Category 3 Blue','Jr Gryphons Fireballs','final',null,true),
 ('timu-1018','timu','2026-04-19T19:00:00Z','13','Niagara Rapids Wild','Milton Edge Thunder','final',null,true),
 ('timu-1019','timu','2026-04-19T19:00:00Z','9','MVC Blackcomb','FCVC Evergreen','final',null,true),
 ('timu-1020','timu','2026-04-19T19:00:00Z','5','Pakmen Gold Andrea','EVP Eagles Rise','final',null,true)
) m(ext,kind,t,court,home,away,status,pool,est)
join public.sources s on s.kind = m.kind
join public.event_days ed on ed.date = (m.t::timestamptz at time zone 'America/Toronto')::date
join public.courts c on c.label = m.court
join public.teams ht on ht.name = m.home
join public.teams at on at.name = m.away;

insert into public.results (match_id, home_sets, away_sets, set_scores)
select m.id, r.h, r.a, r.s::jsonb from public.matches m join (values
 ('timu-1000',2,1,'[[23,25],[25,20],[15,8]]'),('timu-1001',2,0,'[[25,10],[25,8]]'),('timu-1002',2,0,'[[25,7],[26,24]]'),
 ('timu-1003',0,2,'[[21,25],[15,25]]'),('timu-1004',2,1,'[[19,25],[25,18],[18,16]]'),('timu-1005',2,0,'[[25,15],[25,12]]'),
 ('timu-1006',2,0,'[[25,8],[25,12]]'),('timu-1007',2,0,'[[25,16],[25,12]]'),('timu-1008',0,2,'[[18,25],[19,25]]'),
 ('timu-1009',2,0,'[[25,16],[25,16]]'),('timu-1010',2,1,'[[25,19],[21,25],[15,10]]'),('timu-1011',2,0,'[[25,22],[28,26]]'),
 ('timu-1012',2,0,'[[25,9],[25,11]]'),('timu-1013',2,0,'[[25,21],[27,25]]'),('timu-1014',2,1,'[[25,9],[23,25],[15,12]]'),
 ('timu-1015',0,2,'[[17,25],[22,25]]'),('timu-1016',2,0,'[[28,26],[25,13]]'),('timu-1017',2,1,'[[25,21],[19,25],[15,8]]'),
 ('timu-1018',0,2,'[[23,25],[18,25]]'),('timu-1019',2,0,'[[33,31],[25,16]]'),('timu-1020',2,0,'[[25,14],[25,16]]')
) r(ext,h,a,s) on r.ext = m.external_id;

insert into public.announcements (event_id, title, body, severity, published)
select e.id, a.t, a.b, a.s, true from public.events e, (values
 ('5-5 warm-up at every court','All Ontario Championships matches use a 5-minute shared and 5-minute split warm-up.','important'),
 ('No outside food, chairs or coolers','Athletes may bring their own brown-bag lunch in their backpack.','info'),
 ('Photography from spectator areas only','Only OVA-authorised photographers may stand on or between courts.','info'),
 ('Fall Classic schedules post Oct 23','Fall Classic schedules will be on AES by October 23, 2026.','info')
) a(t,b,s);

insert into public.sponsors (name, url) values
 ('Canuck Stuff','https://www.canuckstuff.com/store/volleyball/1'),
 ('OVA 50/50','https://ova5050.org'),
 ('Your brand here','https://www.ontariovolleyball.org/ocs-sponsorship');

insert into public.sponsor_slots (event_id, placement, court_id, sponsor_id, headline, offer_text, published)
select e.id, s.p, (select id from public.courts where label = s.court), sp.id, s.h, s.o, true
from public.events e, (values
 ('section',null,'Canuck Stuff','Official event merchandise','Ontario Championships gear and team bulk orders.'),
 ('map_pin','23','OVA 50/50','Buy 50/50 tickets','Win big and give back to volleyball in Ontario.'),
 ('offer',null,'Your brand here','Sponsor slot available','Reach families courtside — see OVA media and sponsorship.')
) s(p,court,sponsor,h,o) join public.sponsors sp on sp.name = s.sponsor;

insert into public.info_links (event_id, category, title, url, description, sort, published)
select e.id, l.c, l.t, l.u, l.d, l.s, true from public.events e, (values
 ('other','Schedules & results on AES','https://results.advancedeventsystems.com/event/MjAyNl9PbnRhcmlvX0NoYW1waW9uc2hpcHNfX19FdmVudF8yX182djZHX19UTFNHX18xNVVCXw2/home','Official pools, brackets and standings.',1),
 ('streaming','Watch live on CBC Connect','https://www.ontariovolleyball.org/ocs-sponsorship','Ontario Championships games are streamed live.',2),
 ('hotel','Accommodations','https://www.ontariovolleyball.org/accommodations','Stay to Play hotel booking. OVA sign-in required.',3),
 ('hotel','Fall Classic hotels & Stay to Play','https://www.ontariovolleyball.org/fall-classic','Cohere Centre, Ottawa, Nov 6–8 2026.',4),
 ('merch','Shop event gear','https://www.canuckstuff.com/store/volleyball/1','Official Ontario Championships merchandise.',5),
 ('raffle','OVA 50/50 raffle','https://ova5050.org','Proceeds develop coaches, referees and clubs.',6),
 ('other','Venue rules & code of conduct','https://www.ontariovolleyball.org/code-of-conduct','No outside food, chairs or coolers. Brown-bag lunches allowed.',7),
 ('other','OVA on Instagram','https://www.instagram.com/ova_updates/','Live updates and photos.',8),
 ('other','Ontario Championships page','https://www.ontariovolleyball.org/ontario-championships','Event information and policies.',9)
) l(c,t,u,d,s);
