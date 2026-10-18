-- Real source switches. Config updates only, no deletes. Run in Supabase > SQL Editor only when you want each path on.
-- Every statement is reversible by setting the config back (see the comments).

-- MyTeam beach: real schedule. Real data is dated April 21 2026, so it is labelled "Saved snapshot, not live".
-- It replaces only this source's six sample beach matches (B-3001 to B-3006) on the next sync.
-- Pairs appear as initials only. Court map sends MyTeam courts 1, 3, 4, 6 to app courts 5, 9, 13, 17.
-- To turn off: update public.sources set config = config - 'schedule_id' - 'court_map' where kind = 'myteam';
update public.sources
set config = config || '{"schedule_id":"REPLACE_WITH_MYTEAM_SCHEDULE_ID","division":"15U Girls Premier (beach)","court_map":{"1":"5","3":"9","4":"13","6":"17"}}'::jsonb
where kind = 'myteam';

-- AES real court schedule: leave OFF unless OVA authorizes it. AES refuses server requests (HTTP 403),
-- which is recorded as a failed run and keeps the last data. To turn on later:
-- update public.sources set config = config || '{"schedule_dates":["2026-04-20"],"only_courts":["5","9"]}'::jsonb where kind = 'aes';
-- To turn off: update public.sources set config = config - 'schedule_dates' - 'only_courts' where kind = 'aes';
