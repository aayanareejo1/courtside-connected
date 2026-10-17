ALTER TABLE public.events ADD COLUMN IF NOT EXISTS registration_url text NOT NULL DEFAULT 'https://www.ontariovolleyball.org/';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS registration_live boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.events.registration_url IS 'Speer registration app URL once live; OVA site until then';