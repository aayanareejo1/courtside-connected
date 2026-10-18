## Architecture rules
- Front end reads only canonical tables (events, courts, matches, ...); never a source platform directly. Why: sources (AES, TIMU, Speer...) change per event/day/division.
- Matches carry an optional pool label so TIMU-shaped pool play maps into canonical rows.
- Each data source is an adapter mapping into canonical tables, run server-side only. Why: adding a source = adding one adapter.
- UI strings live in src/lib/i18n.ts. Why: French can be added without touching components.
- Participants read published canonical rows without accounts; existing database write restrictions remain intact. Why: removing staff-facing UI must not grant public write access.

- Search and team pages share an event-scoped canonical directory query; public RLS remains the visibility boundary. Why: results and roster links stay consistent for the active event.
- Device follows use one namespaced local-storage key and a shared subscription store hydrated after SSR. Why: follow controls stay synchronized without spectator accounts.
- Combined schedules resolve player follows to teams and deduplicate matches by ID; arrival and clash rules are pure tested functions using event settings and estimated durations. Why: shared matches appear once and timing changes propagate consistently.
- Schedule dates and times use the event venue's Toronto timezone rather than the spectator device timezone. Why: arrival instructions must match venue clocks.
- Announcements may target one division or one hall; Home shows untargeted ones, while team, court and My schedule pages show those matching their division or hall. Why: targeted updates reach only the people they concern.
- Home, Info and Sponsors share an event-scoped published-content query; announcements respect their active window and sponsor pins link to the matching offer. Why: public event content stays consistent across views.
- Staff editing uses authenticated server functions with database role verification, validated payloads, and event-scoped mutations; no service-role client is used for normal edits. Why: route visibility alone must never grant write access.
- Participant routes need no account; a single small staff area (announcement form only) sits behind sign-in with role checks. Why: discovery stays public while non-technical staff can post updates.
- Adapters return canonical matches, rosters or status updates; the sync resolves every name before writing so a bad batch changes nothing, and roster refreshes keep player IDs by jersey. Why: last known data and device follows survive source errors.
- Source sync runs server-side on a short managed schedule via a cron-authenticated public job route; TIMU parses live results.php HTML only when the source config names a tournament ID (the demo uses the sample fixture so every team has a roster) and errors on failure (last known data stays, run recorded as error); every run records its provenance (live, sample, snapshot, metadata). Why: front end never touches sources and failures keep last known data.
- Speer is a swappable roster adapter (mock reads a CSV in the sample roster format); the Register button still links out via the event registration link. Why: Speer has no live link yet.
- AES adapter reads the public AES event endpoint by event key from source config; MyTeam beach data is a stored snapshot because the page renders client-side. Why: only AES exposes readable JSON.
- Event data is cached on the device (one namespaced key) and served with its save time when loading fails; a banner says when saved data is shown. Why: schedules stay readable on weak venue Wi-Fi without a service worker.
