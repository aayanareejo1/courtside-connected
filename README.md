# Courtside Connected

Participant-first mobile web app for Ontario Volleyball Association events: find players, teams, clubs and courts,
follow them on the device, see a combined schedule with arrival time and clash warnings, read event info and sponsors.
Staff post announcements through one small invite-only form. See `AGENTS.md` for architecture rules and `roadmap.md` for status.

Stack: React 19, TanStack Start, Tailwind v4, Supabase (database, auth), Cloudflare Workers (hosting), Bun.

## Local development
1. `bun install`
2. Copy `.env.example` to `.env` and fill in your Supabase URL and publishable key.
3. `bun run dev` (port 8080), `bun run test`, `bun run build`

## New environment from scratch
1. **Supabase project**: run `supabase/setup.sql`, then `supabase/seed.sql` in the SQL Editor.
2. **Auth**: Authentication > Sign In / Providers: turn off "Allow new users to sign up" (staff are invite only).
   Authentication > URL Configuration: set Site URL to the deployed app URL and add `<app>/reset-password` as a redirect URL.
3. **Cloudflare Worker**: Workers & Pages > Create > Import a repository > this repo.
   - Build command: `bun run build`
   - Deploy command: `npx wrangler deploy --config .output/server/wrangler.json`
   - Build variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
   - Runtime variables and secrets: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (secret), `CRON_SECRET` (secret)
4. **Scheduled sync**: fill in and run `supabase/cron.sql`.
5. **Staff**: invite each staff email in Supabase Auth, then run `supabase/staff.sql` for each.

Never put the service role key or cron secret in a `VITE_` variable or in git.

## Privacy
Players are minors. Public displays are first name + last initial + jersey; beach pairs are initials only.
The original roster spreadsheet with full names must never be committed.
