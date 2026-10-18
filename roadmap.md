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
- [x] 10b. After migration (2026-10-18): pg_cron fires every two minutes (00:34, 00:36 UTC), app returns HTTP 200, all four sources record runs. Keep watching with the queries in supabase/cron.sql. Verify reliable two-minute execution — recent run times are irregular; active job configuration alone does not prove the requested cadence.

## Hosting (since 2026-10-18)
- App: Cloudflare Worker courtside-connected (courtside-connected.aayanareejo.workers.dev), builds from main on push
- Data and staff sign-in: Supabase project courtside-connected (Canada Central), invite-only sign-up
- Sync: Supabase pg_cron every two minutes, Bearer secret stored in Vault
- [ ] 11. Provenance: TIMU fallback and mock sources still record 'ok'; label live vs fallback vs mock honestly
- [ ] 12. Staff accounts: invite staff emails in Supabase Auth, then run supabase/staff.sql
