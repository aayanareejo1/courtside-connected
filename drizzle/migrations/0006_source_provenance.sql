-- Honest data labels: record what kind of data each sync produced.
ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS last_provenance text NOT NULL DEFAULT 'sample'
  CHECK (last_provenance IN ('live','sample','snapshot','metadata'));
ALTER TABLE public.source_runs ADD COLUMN IF NOT EXISTS provenance text NOT NULL DEFAULT 'sample'
  CHECK (provenance IN ('live','sample','snapshot','metadata'));
