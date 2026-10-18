# Build order (seeded first, then one live source)
- [x] 1. Seed data refresh: fictional rosters + coaches for every indoor team, full Day 1 TIMU-style pools
- [x] 2. Mock adapters (TIMU, Speer CSV, AES, MyTeam snapshot) with last-good fallback
- [x] 3. Map and search: placeholder floor plan, two halls, courts 5/9/13/17/20/23
- [x] 4. Following and clash warnings re-check
- [x] 5. Info and sponsors re-check
- [x] 6. Staff page built (sign-in, one form, division/hall target)
- [ ] 6b. Create staff accounts — blocked: need staff email addresses
- [x] 7. Accessibility and design polish (Catalyst checklist)
- [x] 8. Time-boxed spike: live TIMU every 2 min, mock fallback
- [ ] 9. AES live matches — blocked: public event endpoint exposes metadata only; need a confirmed authorized schedule/score feed. Research checked the supplied event URL on 2026-10-17; direct public request succeeded, but current app sync still records HTTP 403.
- [x] 10. Verify refresh configuration and inspect recent runs: active two-minute job exists; TIMU has imported 21 matches in recent successful runs.
- [x] 10b. After migration (2026-10-18): pg_cron fires every two minutes (00:34, 00:36 UTC), app returns HTTP 200, all four sources record runs. Keep watching with the queries in supabase/cron.sql.

## Hosting (since 2026-10-18)
- App: Cloudflare Worker courtside-connected (courtside-connected.aayanareejo.workers.dev), builds from main on push
- Data and staff sign-in: Supabase project courtside-connected (Canada Central), invite-only sign-up
- Sync: Supabase pg_cron every two minutes, Bearer secret stored in Vault
- [ ] 11. Provenance: TIMU fallback and mock sources still record 'ok'; label live vs fallback vs mock honestly
- [ ] 12. Staff accounts: invite staff emails in Supabase Auth, then run supabase/staff.sql

## Update 2026-10-18
- Item 11 (provenance) done: sources.last_provenance and source_runs.provenance (live, sample, snapshot, metadata) are written by every sync and shown on Home. A configured live TIMU fetch that fails now records an error and keeps last known data instead of writing sample rows. Migration 0006.
- Item 12 (staff): aayanareejo@gmail.com invited and granted staff. Publish/delete test pending first sign-in.
- Phase 1 checks: axe found 0 violations on /, /search, /following, /info, /sponsors, 404; no horizontal scroll at 390px. /auth and the staff form still need a signed-in pass.
- Phase 2 (AI assistant): see plan agreed with the team before building.

## Current step
- [x] Add docs/demo-checklist.md; complete lovable d8a1f4f checks: 155 tests/20 files PASS; production build PASS; tsgo FAIL (12 errors/5 files). No app, configuration, deployment or SQL changes.
- [ ] Resolve reported strict-type diagnostics in a separate step; hosted routes, two-minute scheduler and staff sign-in require hosted evidence/session.
- [x] Court lookup by number, highlighted area/pin, current-or-next plus next three matches, and missing-position safety. 76 tests passed (19 Court tests plus 57 regressions); isolated component browser checks passed at 375px and 1280px with 44px lookup targets, no overflow or page errors. Hosted checks await review/merge; no SQL or deployment changes.
- [x] Verify device-only team/player follows: public signed-out browser confirmed both follow clicks send zero requests, persistence after reload, Toronto times, sorted matches and final scores. Added future-start filtering, fixed fan arrival lead, per-team empty states, tight-turnaround notes and blocked-storage fallback. 57 tests passed across five suites (22 new follow/schedule tests, 35 existing checks).
- [ ] Verify changed tight-turnaround and empty-team views on hosted lovable code after review/merge; public app currently runs older main code. No SQL or deployment changes.
- [x] Audit provenance across Home, Schedule, Team, Court, Search and Follows: list-level source badges, last successful update times, conservative missing-source and device-snapshot labels. 22 label tests passed; no SQL or deployment changes.
- [ ] Review lovable changes before merging; hosted verification pending merge.

## Real source adapters (branch real_sources)
- MyTeam: `mapMyteam` (pure, tested). Live only when the source config has `schedule_id`. Pairs become initials. Past dates are labelled snapshot, re-dated data is labelled sample.
- AES: `mapAesSchedule` (pure, tested). Live only when config has `schedule_dates`; never deletes rows. Server requests currently get HTTP 403, so it stays off until OVA authorizes access.
- TIMU: provenance now follows the data date (past is snapshot, re-dated is sample).
- Config switches live in `supabase/real-sources-config.sql`. These are undocumented public endpoints; get OVA authorization before relying on them.

## Demo clock, calendar logic and Ask Courtside (branch app_logic)
- `?demo=1` starts an app clock at 12:30 PM on April 19 2026 (Toronto) that then runs forward; `?demo=0` turns it off. All fan facing "now" values use `appNow()`. Source health still uses real time.
- `src/lib/calendar.ts`: `buildCalendar` (days, leave by, clash and tight turnaround flags, priority) and `toIcs` / `downloadIcs`. Screens only render this.
- `POST /api/public/ask` (Ask Courtside): reads canonical event data, sends a short facts block to Claude, falls back to a basic answer without `ANTHROPIC_API_KEY` or on failure. Set the key as a server secret only.
- Sample TIMU day one now has finished, live and upcoming matches that fit the demo clock. A sync that reports no result for a match removes any old score.
- Planned, not built: leave by push notifications.

## Ask Courtside (AI assistant)
- Model: Claude Haiku via `POST /api/public/ask`. Needs the server secret `ANTHROPIC_API_KEY` (Cloudflare Worker secret). Without it, or if the model fails, a plain rule based answer is returned (`mode: "basic"`).
- Knowledge: live event data (matches, teams, players, courts, announcements, sponsor slots), published info links (staff editable) and the case study links in `src/lib/ask-knowledge.ts`, each with what it is for. The private roster sheet and the Catalyst app are deliberately excluded.
- Safety: only URLs from its LINKS list can appear in an answer, answers say when data is sample or a snapshot, names stay first name and last initial, questions are capped at 300 characters and rate limited.
- Tickets: no vendor link has been supplied. Run `supabase/ask-links.sql` for a placeholder, then put the vendor URL (with `{qty}`) in the tickets info link.

## Dark redesign
- [x] Preserve content and flows while applying dark semantic colors, supplied Ontario Volleyball logo, consistent controls and reduced-motion-aware animation.
- [x] Existing tests: 204 passed; production build passed.
- [x] Verified real-event Home, Search, team follow, populated calendar and ICS export, court pin, Info, Sponsors and Ask panel at 375px and desktop. No horizontal overflow.
- [ ] Deliver and merge the redesign.
- Existing issue observed during review: returning Home after a reload can report a source-badge hydration mismatch between saved snapshot and sample labels; data-cache logic was not changed by this visual redesign.
