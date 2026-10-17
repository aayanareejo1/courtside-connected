-- Two-minute source sync. Run AFTER the app is deployed.
-- Replace the two placeholders below, then run in Supabase > SQL Editor.
--   <APP_URL>      e.g. https://courtside-connected.<your-subdomain>.workers.dev
--   <CRON_SECRET>  the same value set as the CRON_SECRET secret on the Worker
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Keep the secret in Vault rather than in the job text.
select vault.create_secret('<CRON_SECRET>', 'cron_secret');

select cron.schedule(
  'sync-sources',
  '*/2 * * * *',
  $$
  select net.http_post(
    url := '<APP_URL>/api/public/jobs/sync-sources',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);

-- Check it is really running every two minutes (handoff item 10b):
--   select start_time, status, return_message from cron.job_run_details order by start_time desc limit 20;
--   select s.name, r.started_at, r.status, r.rows_upserted, r.error from public.source_runs r join public.sources s on s.id = r.source_id order by r.started_at desc limit 20;
