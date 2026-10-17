-- 0002 and 0004 were exported empty although the app depends on these columns.
-- Idempotent, so it is safe on a database that already has them.
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS pool text;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS time_estimated boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.matches.time_estimated IS 'True when the source gives no exact start time (TIMU round estimates); the UI must label it.';
