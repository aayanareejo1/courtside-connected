## Architecture rules
- Front end reads only canonical tables (events, courts, matches, ...); never a source platform directly. Why: sources (AES, TIMU, Speer...) change per event/day/division.
- Matches carry an optional pool label so TIMU-shaped pool play maps into canonical rows.
- Each data source is an adapter mapping into canonical tables, run server-side only. Why: adding a source = adding one adapter.
- UI strings live in src/lib/i18n.ts. Why: French can be added without touching components.
- Participants read published canonical rows without accounts; existing database write restrictions remain intact. Why: removing staff-facing UI must not grant public write access.

- Search and team pages share an event-scoped canonical directory query; public RLS remains the visibility boundary. Why: results and roster links stay consistent for the active event.
- Device follows use one namespaced local-storage key and a shared subscription store hydrated after SSR. Why: follow controls stay synchronized without spectator accounts.
- Combined schedules resolve player follows to teams and deduplicate matches by ID; shared pure helpers determine upcoming rows, fixed fan arrival guidance, tight turnarounds and empty teams, with estimated durations retained for clash warnings. Why: every fan gets consistent, tested schedule guidance without changing staff settings.
- Schedule dates and times use the event venue's Toronto timezone rather than the spectator device timezone. Why: arrival instructions must match venue clocks.
- Announcements may target one division or one hall; Home shows untargeted ones, while team, court and My schedule pages show those matching their division or hall. Why: targeted updates reach only the people they concern.
- Home, Info and Sponsors share an event-scoped published-content query; announcements respect their active window and sponsor pins link to the matching offer. Why: public event content stays consistent across views.
- Staff editing uses authenticated server functions with database role verification, validated payloads, and event-scoped mutations; no service-role client is used for normal edits. Why: route visibility alone must never grant write access.
- Participant routes need no account; a single small staff area (announcement form only) sits behind sign-in with role checks. Why: discovery stays public while non-technical staff can post updates.
- Adapters return canonical matches, rosters or status updates; the sync resolves every name before writing so a bad batch changes nothing, and roster refreshes keep player IDs by jersey. Why: last known data and device follows survive source errors.
- Source sync runs server-side on a short managed schedule via a cron-authenticated public job route; TIMU parses live results.php HTML only when the source config names a tournament ID (the demo uses the sample fixture so every team has a roster) and errors on failure (last known data stays, run recorded as error); every run records its provenance (live, sample, snapshot, metadata). Why: front end never touches sources and failures keep last known data.
- Speer is a swappable roster adapter (mock reads a CSV in the sample roster format); the Register button still links out via the event registration link. Why: Speer has no live link yet.
- AES and MyTeam have real adapters that turn on only through source config (AES `schedule_dates`, MyTeam `schedule_id`); without that config AES checks the event endpoint and MyTeam applies status updates. AES never deletes rows, MyTeam replaces only its own source's matches, and beach pairs become initials. Real data is live only on or after its event day (Toronto time), earlier days are snapshots, and data moved to a demo date is sample. Why: labels stay honest and a blocked source cannot wipe good data.
- Public event directory, content, venue and team-coach reads use separate namespaced device caches, cached Query initial data and offline-capable query execution; saved copies survive failed or slow refreshes, with conservative save timestamps and fixed skeleton/notice space. Never cache staff sessions or private workspace responses. Why: cached schedules and announcements remain visible on venue Wi-Fi without mixing datasets or changing deployment.
- Match lists share pure source-notice rules and one badge component, attributed by canonical match source_id; missing attribution is conservative and device fallback overrides live provenance. Why: every screen stays honest without per-row badge noise.
- Court match reads reuse the event-directory device cache and canonical teams. Why: last-known court schedules survive cold offline navigation.

- Court schedules use a pure time-aware selector for current-or-next plus three later matches; map markers require finite in-range coordinates and court navigation stays available as a numbered list. Why: missing positions never break schedule discovery on phones.

- Home summarizes canonical current/next matches with device follows and honest list-level provenance; shared match time/score elements expose team-aware scores and Toronto dates to assistive technology. Why: the phone overview and screen-reader detail stay consistent without inventing live activity.

- Shared dark appearance, motion, navigation and control styling live in the global semantic tokens, AppShell and UI Button; screens consume those roles rather than fixed colors. Why: every participant and staff screen stays consistent as branding changes.

- Ask Courtside receives the last three exchanges and resolves "my", "me" and follow ups to the player or team named earlier (never for sponsor, hotel, merchandise, 50/50 or directions questions); a named player or team always gets a full profile (team, division, club, coaches, record, every match with court, hall and arrival time). Why: a fan can talk to it naturally and still get one complete answer.
- Venue directions come from one pure helper (Google Maps and Apple Maps links built from the venue name and address); the team page shares through the phone share sheet or copies the link. Why: no map or share vendor needed.


- Calendar presentation reuses columns from buildCalendar conflict IDs and offers an in-memory agenda/day toggle; no screen recomputes leave times, ends or conflicts. Why: crowded schedules stay readable without altering event rules.
- The Venue route owns the full venue guide, directions, parking and food; Home and Info link there, while courts keep a highlighted location preview. Why: venue information has one discoverable destination without losing court context.
