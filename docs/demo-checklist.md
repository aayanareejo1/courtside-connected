# Courtside Connected — demo release checklist

Record reviewed/deployed commit, UTC/Toronto time, tester and evidence. Unchecked means **not verified**, not pass. Repeat hosted checks after review/merge through the existing deployment. Do not change sign-in, policies, configuration or production data to make a check pass. Never record passwords, keys, tokens, full minor names or private staff responses.

## 1. Every route loads

- [ ] `/`: event, happening now, next destination and provenance visible; archived/sample data never presented as current live activity.
- [ ] `/search`: search a team/player/jersey/court and follow result links.
- [ ] `/following`: Upcoming, Results and no-follows state.
- [ ] `/teams/<existing-team-id>` and `/courts/<existing-court-id>`: open from search and reload directly; unknown IDs produce understandable not-found views, not blank pages.
- [ ] `/info` and `/sponsors`: internal/external links work; distinguish timeout/rate-limit from a proven broken link.
- [ ] `/auth` and `/reset-password`: sign-in page loads; missing recovery link gives safe explanation. Account owner privately checks valid invitation/recovery links.
- [ ] `/staff`: signed-out redirect to sign-in, no write controls; authorized staff can enter; non-staff cannot use staff actions.
- [ ] Unknown URL gives not-found view. Every page has no unexpected console errors; check at 375px, with 200% text, keyboard focus and accessible time/score labels.
- [ ] `POST /api/public/jobs/sync-sources`: verify scheduled authorized execution and unauthorized rejection. Not an ordinary browser GET. Never paste the job secret into documentation/browser tools.

Root/pathless layouts are not separate URLs. Use real canonical IDs, not literal URL placeholders. A build pass does not prove data-bearing pages or staff flows work.

## 2. Sync runs every two minutes

- [ ] One active existing scheduler job uses `*/2 * * * *` and the correct existing endpoint.
- [ ] Observe at least three consecutive run starts about two minutes apart (for example 00:34, 00:36, 00:38 UTC); record only timestamps/statuses.
- [ ] Confirm HTTP outcome and per-source run records separately; HTTP success does not prove every source succeeded.
- [ ] Each configured source records last run, status and provenance; successful imports appear through canonical match/result reads.

Use the existing dashboard/read-only inspection instructions in `supabase/cron.sql`. The agent does not execute SQL. Historical roadmap evidence is not fresh verification of today's scheduler.

## 3. Every source has the right label

| Actual provenance | Required badge |
| --- | --- |
| `live` | Live from the source |
| `sample` | Sample data, not live |
| `snapshot` | Saved snapshot, not live |
| `metadata` | Event check only, no live scores |

- [ ] Home, Schedule (Following/My schedule), Team, Court, Search and Follows: each nonempty match list has badges near its top, not on every row.
- [ ] Mixed-source lists show each represented source; missing attribution is conservative, never assumed live.
- [ ] TIMU authorized live tournament reads use live; fixture uses sample. Speer mock uses sample; MyTeam stored data uses snapshot; AES metadata-only checks use metadata. Manual sources use actual recorded provenance, not their name.
- [ ] Offline fallback shows saved snapshot even if original data was live. Failed/stale sources show Last updated with last-known time or honestly say time unavailable.

## 4. Failure keeps old data

- [ ] First identify known canonical matches/results, announcements and timestamps.
- [ ] Observe an existing source failure, or use automated failure fixtures. Do not break production credentials, change configuration or delete data.
- [ ] Adapter-fetch failure records failure and keeps last-known canonical rows visible; no sample replacement is described as live.
- [ ] With a saved device copy, simulate offline/slow connection: cached schedule and announcements remain visible with saved-time banner; skeletons never replace saved data with an empty screen.
- [ ] Restore connectivity; successful refresh updates data and timestamps.

Source application is not transactional: later write failures can leave partial changes, including inserted teams. Last-known-data behavior is not an atomic rollback guarantee. Failure-run provenance retains the previously reported audit gap. Data caching is not application-shell caching: first-ever offline visits/full offline reloads are not guaranteed.

## 5. Minors' names are abbreviated

- [ ] Home, Search, Team, Following and match views show first name + last initial and jersey only for minors; beach pairs show initials only.
- [ ] Accessible names, tooltips, score labels and follow labels do not leak full minor surnames.
- [ ] Privacy checks use fictional fixtures; attach no real rosters/names to the report.

## 6. Follows work offline without an account

- [ ] Signed out, follow team and player: follow/unfollow sends **zero** requests and stays on the device.
- [ ] Reload online: selections persist. Then go offline after loading: follows, saved schedule and announcements remain visible while navigating within the loaded app.
- [ ] Banner reads `You are offline. Showing saved data from [time]`, with actual saved time.
- [ ] Upcoming matches sorted by start; court, Toronto start and arrival exactly 15 minutes earlier (10-minute warm-up + 5-minute walk).
- [ ] Followed team with no upcoming matches has clear empty state; starts within 30 minutes show tight turnaround; finished matches show result or explicitly say not posted.
- [ ] Block storage writes in a test: app stays usable and never sends follows to server; persistence cannot be guaranteed without storage.

## 7. Staff sign-in works

- [ ] Invited staff signs in using unchanged method, reaches `/staff`; sign-out restores gate.
- [ ] Publish/read back approved demo announcements with info, important and urgent severities and optional division/area. Do not create unsolicited production announcements.
- [ ] Signed-out/non-staff cannot publish; actual deployed permissions verified separately from mocked tests. Report policy gaps, never silently change them.
- [ ] Court/time editing with persistent edited-by-staff marker and source last-run/status/provenance view are known missing staff features; sign-in alone does not pass those requirements.

Without an authorized hosted session and deployed-permission evidence, mark end-to-end staff checks **unverified**. Never request/commit credentials.

## Automated release checks and results

```sh
bun install --frozen-lockfile
bun run test
tsgo --noEmit
bun run build
```

Use locked dependencies and unchanged configuration; no deployment. The repository's existing typecheck script uses `tsc`; this verification used the TypeScript-native `tsgo` checker separately without changing that script. Generated route tree/output must not be committed. Compilation is separate from hosted behavior.

Verified 2026-10-18 UTC on complete `lovable` archive at `d8a1f4fa9035bb4410903a4d96c7bd5153e9f83a`, in an isolated temporary directory.

| Check | Result | Evidence |
| --- | --- | --- |
| Locked install | PASS | Bun 1.4.3; no dependency/config changes |
| Full Vitest suite | PASS | 155 tests / 20 files; Vitest 4.1.12; exit 0 |
| Type check | FAIL | tsgo 7.0.0-dev.20260707.2; 12 diagnostics / 5 files; exit 1 |
| Production build | PASS | Browser, SSR and existing production output compiled; exit 0; not deployed |
| Hosted checklist | UNVERIFIED in this step | Repeat after review/merge using real data and authorized staff session |

Sandbox Bun 1.3.3 could not read lockfile version 2; compatible Bun 1.4.3 installed it unchanged. Type check repeated after build/automatic route generation: same 12 errors. Expected TIMU 503 stderr came from a passing failure test, not production.

### Type-check diagnostics (reported, not fixed in this docs-only step)

- `src/components/CourtScreen.tsx:49,71`: explicitly undefined optional source/save-time and estimated props conflict with exact optional-property types.
- `src/routes/courts.$courtId.tsx:44`: optional sources passed as undefined.
- `src/test/court-screen.test.tsx:15,21`: indexed court fixtures may be undefined.
- `src/test/follows-screen.test.tsx:26–29`: indexed elements may be undefined; `:32`: array-shaped result fixture conflicts with canonical object result type.
- `src/test/home-summary.test.ts:8,10`: spreading unchecked source fixture makes required source ID optional.

Production compilation does not enforce the same strict type checks. No hosted route, scheduler, private staff session, deployed policy or SQL execution was performed in this documentation step.
