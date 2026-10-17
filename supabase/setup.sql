-- Courtside Connected: full schema for a fresh Supabase project.
-- Run once in Supabase > SQL Editor (or psql). Generated from drizzle/migrations 0000 (schema only), 0001, 0003, 0005.
-- Then run supabase/seed.sql for demo content.


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


-- 0001
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS registration_url text NOT NULL DEFAULT 'https://www.ontariovolleyball.org/';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS registration_live boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.events.registration_url IS 'Speer registration app URL once live; OVA site until then';

-- 0003
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS division_id uuid REFERENCES public.divisions(id) ON DELETE SET NULL;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL;

-- 0005
-- 0002 and 0004 were exported empty although the app depends on these columns.
-- Idempotent, so it is safe on a database that already has them.
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS pool text;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS time_estimated boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.matches.time_estimated IS 'True when the source gives no exact start time (TIMU round estimates); the UI must label it.';
