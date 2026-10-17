
-- Roles
create type public.app_role as enum ('admin','staff');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('admin','staff'))
$$;
create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid());

-- Core tables
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('aes','timu','myteam','speer','csv','manual')),
  name text not null,
  config jsonb not null default '{}',
  last_success_at timestamptz,
  last_status text not null default 'never' check (last_status in ('never','ok','error','stale')),
  created_at timestamptz not null default now()
);
create table public.source_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running','ok','error')),
  rows_upserted int not null default 0,
  error text
);
create table public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  floor_plan_path text,
  plan_width int not null default 1000,
  plan_height int not null default 600
);
create table public.areas (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  name text not null,
  kind text not null default 'hall' check (kind in ('hall','warmup','meeting','other')),
  x numeric not null default 0, y numeric not null default 0,
  w numeric not null default 10, h numeric not null default 10
);
create table public.courts (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  area_id uuid references public.areas(id) on delete set null,
  label text not null,
  number int,
  map_x numeric not null default 50,
  map_y numeric not null default 50,
  stream_url text,
  unique (venue_id, label)
);
create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  starts_on date not null,
  ends_on date not null,
  venue_id uuid references public.venues(id) on delete set null,
  warmup_min int not null default 45,
  walk_min int not null default 5,
  published boolean not null default false
);
create table public.event_days (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  date date not null,
  label text not null
);
create table public.divisions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  age_group text,
  gender text,
  default_match_min int not null default 60
);
create table public.day_division_sources (
  event_day_id uuid not null references public.event_days(id) on delete cascade,
  division_id uuid not null references public.divisions(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  primary key (event_day_id, division_id)
);
create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text
);
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete set null,
  division_id uuid references public.divisions(id) on delete set null,
  name text not null,
  external_refs jsonb not null default '{}'
);
create table public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  display_name text not null,
  jersey_number int
);
create table public.staff_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  display_name text not null,
  role text not null default 'Coach'
);
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  event_day_id uuid not null references public.event_days(id) on delete cascade,
  division_id uuid references public.divisions(id) on delete set null,
  court_id uuid references public.courts(id) on delete set null,
  court_label_raw text,
  start_at timestamptz not null,
  est_duration_min int not null default 60,
  home_team_id uuid references public.teams(id) on delete set null,
  away_team_id uuid references public.teams(id) on delete set null,
  status text not null default 'scheduled' check (status in ('scheduled','live','final','cancelled')),
  source_id uuid references public.sources(id) on delete set null,
  external_id text,
  unique (source_id, external_id)
);
create table public.results (
  match_id uuid primary key references public.matches(id) on delete cascade,
  home_sets int not null default 0,
  away_sets int not null default 0,
  set_scores jsonb not null default '[]',
  updated_at timestamptz not null default now()
);
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  body text not null default '',
  severity text not null default 'info' check (severity in ('info','important','urgent')),
  starts_at timestamptz,
  ends_at timestamptz,
  published boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_path text,
  url text
);
create table public.sponsor_slots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  placement text not null check (placement in ('banner','map_pin','section','offer')),
  court_id uuid references public.courts(id) on delete set null,
  sponsor_id uuid references public.sponsors(id) on delete set null,
  headline text,
  offer_text text,
  published boolean not null default false
);
create table public.info_links (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  category text not null check (category in ('parking','hotel','streaming','food','tickets','merch','raffle','discounts','other')),
  title text not null,
  url text,
  description text,
  sort int not null default 0,
  published boolean not null default false
);

create index on public.teams using btree (lower(name));
create index on public.players using btree (lower(display_name));
create index on public.matches (start_at);

-- Grants + RLS
do $$
declare t text;
begin
  foreach t in array array['sources','source_runs','venues','areas','courts','events','event_days','divisions','day_division_sources','clubs','teams','players','staff_members','matches','results','announcements','sponsors','sponsor_slots','info_links'] loop
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "staff write %1$s" on public.%1$I for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()))', t);
  end loop;
  foreach t in array array['sources','source_runs','venues','areas','courts','event_days','divisions','day_division_sources','clubs','teams','players','staff_members','matches','results','sponsors'] loop
    execute format('create policy "public read %1$s" on public.%1$I for select to anon, authenticated using (true)', t);
  end loop;
  foreach t in array array['events','announcements','sponsor_slots','info_links'] loop
    execute format('create policy "public read published %1$s" on public.%1$I for select to anon, authenticated using (published)', t);
  end loop;
end $$;

-- ===== Seed (fictional) =====
insert into public.sources (kind, name, last_success_at, last_status) values
 ('timu','TIMU.ca (mock)', now() - interval '4 minutes','ok'),
 ('aes','AES (mock)', now() - interval '2 minutes','ok'),
 ('speer','Speer rosters (mock)', now() - interval '3 hours','ok'),
 ('manual','Manual entry', null,'never');

insert into public.venues (name, address) values ('Lakeview Sports Centre (demo)', '100 Fictional Way, Toronto, ON');

insert into public.areas (venue_id, name, kind, x, y, w, h)
select v.id, a.name, a.kind, a.x, a.y, a.w, a.h from public.venues v,
 (values ('Hall 1','hall',2,5,46,70),('Hall 4','hall',52,5,46,70),('Hall 4 warm up','warmup',52,78,28,18),('Meeting Room A','meeting',2,78,22,18)) as a(name,kind,x,y,w,h);

insert into public.courts (venue_id, area_id, label, number, map_x, map_y, stream_url)
select v.id, ar.id, c.label, c.num, c.x, c.y, c.stream from public.venues v
join (values
 ('5',5,'Hall 1',10,18,'https://stream.example.com/court-5'),
 ('9',9,'Hall 1',25,18,null),
 ('13',13,'Hall 1',40,18,null),
 ('17',17,'Hall 1',10,50,'https://stream.example.com/court-17'),
 ('20',20,'Hall 1',25,50,null),
 ('23',23,'Hall 1',40,50,null),
 ('31',31,'Hall 4',60,18,'https://stream.example.com/court-31'),
 ('34',34,'Hall 4',75,18,null),
 ('37',37,'Hall 4',90,18,null),
 ('40',40,'Hall 4',60,50,null),
 ('43',43,'Hall 4',75,50,null),
 ('46',46,'Hall 4',90,50,null)
) as c(label,num,area,x,y,stream) on true
join public.areas ar on ar.venue_id = v.id and ar.name = c.area;

insert into public.events (name, slug, starts_on, ends_on, venue_id, published)
select 'OVA Fall Classic (demo)', 'fall-classic-demo', '2026-11-06', '2026-11-07', id, true from public.venues;

insert into public.event_days (event_id, date, label)
select e.id, d.date::date, d.label from public.events e, (values ('2026-11-06','Friday'),('2026-11-07','Saturday')) d(date,label);

insert into public.divisions (event_id, name, age_group, gender)
select e.id, d.name, d.age, 'Girls' from public.events e, (values ('15U Girls','15U'),('13U Girls','13U')) d(name,age);

insert into public.day_division_sources (event_day_id, division_id, source_id)
select ed.id, dv.id, s.id from public.event_days ed cross join public.divisions dv
join public.sources s on s.kind = case when true then null end
where false;
insert into public.day_division_sources (event_day_id, division_id, source_id)
select ed.id, dv.id, s.id from public.event_days ed cross join public.divisions dv
join public.sources s on s.kind = (case ed.label when 'Friday' then 'timu' else 'aes' end);

insert into public.clubs (name, city) values
 ('Toronto Skyline VC','Toronto'),('Lakeshore Storm','Mississauga'),('Ottawa Peaks','Ottawa'),
 ('Hamilton Harbour VC','Hamilton'),('London Lightning','London'),('Kingston Tide','Kingston');

insert into public.teams (club_id, division_id, name)
select c.id, d.id, t.team from (values
 ('Toronto Skyline VC','15U Girls','Toronto Skyline 15U Blue'),
 ('Ottawa Peaks','15U Girls','Ottawa Peaks 15U Red'),
 ('Hamilton Harbour VC','15U Girls','Hamilton Harbour 15U'),
 ('London Lightning','15U Girls','London Lightning 15U Gold'),
 ('Lakeshore Storm','13U Girls','Lakeshore Storm 13U'),
 ('Kingston Tide','13U Girls','Kingston Tide 13U'),
 ('Toronto Skyline VC','13U Girls','Toronto Skyline 13U White'),
 ('Ottawa Peaks','13U Girls','Ottawa Peaks 13U Blue')
) t(club,div,team)
join public.clubs c on c.name = t.club join public.divisions d on d.name = t.div;

insert into public.players (team_id, display_name, jersey_number)
select t.id, p.n, p.j from public.teams t, (values
 ('Maya R.',1),('Ava L.',3),('Chloe T.',4),('Priya S.',5),('Sofia M.',7),('Emma K.',8),
 ('Zara H.',9),('Nora B.',10),('Lily C.',11),('Hana W.',12),('Ella D.',14),('Grace P.',15)
) p(n,j) where t.name = 'Toronto Skyline 15U Blue';
insert into public.staff_members (team_id, display_name, role)
select id, 'Coach Dana F.', 'Head Coach' from public.teams where name='Toronto Skyline 15U Blue'
union all select id, 'Coach Marcus O.', 'Assistant Coach' from public.teams where name='Toronto Skyline 15U Blue';
insert into public.players (team_id, display_name, jersey_number)
select t.id, p.n, p.j from public.teams t, (values ('Leo R.',2),('Isla G.',6),('Mia V.',13),('Ruby N.',17),('Tess A.',19),('June Q.',21))
 p(n,j) where t.name = 'Lakeshore Storm 13U';

-- Matches: times in America/Toronto
insert into public.matches (event_day_id, division_id, court_id, court_label_raw, start_at, est_duration_min, home_team_id, away_team_id, status, source_id, external_id)
select ed.id, ht.division_id, c.id, m.court, (ed.date::text || ' ' || m.t)::timestamp at time zone 'America/Toronto', 60,
  ht.id, at.id, m.status, s.id, m.ext
from (values
 ('Friday','09:00','5','Toronto Skyline 15U Blue','Ottawa Peaks 15U Red','final','T-1001'),
 ('Friday','10:30','20','Lakeshore Storm 13U','Kingston Tide 13U','final','T-1002'),
 ('Friday','11:00','9','Hamilton Harbour 15U','London Lightning 15U Gold','final','T-1003'),
 ('Friday','12:00','13','Toronto Skyline 15U Blue','Hamilton Harbour 15U','final','T-1004'),
 ('Friday','13:00','23','Toronto Skyline 13U White','Ottawa Peaks 13U Blue','final','T-1005'),
 ('Friday','14:00','17','Lakeshore Storm 13U','Toronto Skyline 13U White','final','T-1006'),
 ('Saturday','08:30','31','Toronto Skyline 15U Blue','London Lightning 15U Gold','scheduled','A-2001'),
 ('Saturday','08:30','34','Ottawa Peaks 15U Red','Hamilton Harbour 15U','scheduled','A-2002'),
 ('Saturday','09:45','46','Lakeshore Storm 13U','Ottawa Peaks 13U Blue','scheduled','A-2003'),
 ('Saturday','11:00','37','Toronto Skyline 15U Blue','Ottawa Peaks 15U Red','scheduled','A-2004'),
 ('Saturday','12:30','40','Kingston Tide 13U','Toronto Skyline 13U White','scheduled','A-2005'),
 ('Saturday','13:30','43','Lakeshore Storm 13U','Kingston Tide 13U','scheduled','A-2006')
) m(day,t,court,home,away,status,ext)
join public.event_days ed on ed.label = m.day
join public.courts c on c.label = m.court
join public.teams ht on ht.name = m.home
join public.teams at on at.name = m.away
join public.sources s on s.kind = (case m.day when 'Friday' then 'timu' else 'aes' end);

insert into public.results (match_id, home_sets, away_sets, set_scores)
select m.id, r.h, r.a, r.s::jsonb from public.matches m join (values
 ('T-1001',2,1,'[[25,21],[22,25],[15,11]]'),('T-1002',2,0,'[[25,18],[25,20]]'),
 ('T-1003',1,2,'[[25,23],[19,25],[12,15]]'),('T-1004',2,0,'[[25,17],[25,22]]'),
 ('T-1005',0,2,'[[20,25],[23,25]]'),('T-1006',2,1,'[[25,22],[21,25],[15,13]]')
) r(ext,h,a,s) on r.ext = m.external_id;

insert into public.announcements (event_id, title, body, severity, published)
select e.id, a.t, a.b, a.s, true from public.events e, (values
 ('Doors open at 7:30 AM','Main entrance on the north side. Bags may be checked.','info'),
 ('Hall 4 parking lot is full','Use overflow lot P3 with a free shuttle every 10 minutes.','important'),
 ('Court 37 delayed 15 minutes','Equipment check in progress.','urgent')
) a(t,b,s);

insert into public.sponsors (name, url) values
 ('Northline Sports (demo)','https://example.com/northline'),
 ('Maple Bean Café (demo)','https://example.com/maplebean'),
 ('Harbour Physio (demo)','https://example.com/harbourphysio');
insert into public.sponsor_slots (event_id, placement, sponsor_id, court_id, headline, offer_text, published)
select e.id, s.p, sp.id, (select id from public.courts where label = s.court), s.h, s.o, true
from public.events e, (values
 ('section','Northline Sports (demo)',null,'Official gear partner',null),
 ('map_pin','Maple Bean Café (demo)','23','Coffee by Court 23','10% off with this screen'),
 ('offer','Harbour Physio (demo)',null,'Free taping clinic','Saturday 9–11 AM, Meeting Room A')
) s(p,sponsor,court,h,o) join public.sponsors sp on sp.name = s.sponsor;

insert into public.info_links (event_id, category, title, url, description, sort, published)
select e.id, l.c, l.t, l.u, l.d, l.s, true from public.events e, (values
 ('parking','Parking and map','https://example.com/parking','Lots P1–P3, overflow shuttle',1),
 ('hotel','Team hotel booking','https://example.com/hotels','Event rates until Oct 30',2),
 ('streaming','Live streams','https://example.com/streams','Courts 5, 17 and 31',3),
 ('food','Food pre-orders','https://example.com/food','Skip the line at the concession',4),
 ('raffle','50/50 raffle','https://example.com/5050','Licensed draw run by a third party',5)
) l(c,t,u,d,s);
