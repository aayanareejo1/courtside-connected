<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
Subdirectories have their own AGENTS.md (src/lib/AGENTS.md: data, sources, schedules, assistant facts); read it before changing files there.

- This Lovable project hosts the OVAchamps app copied from aayanareejo1/courtside-connected main; the database stays on the existing external backend, read with its publishable key in .env. Why: the Lovable runtime provides the server-only AI key for typed answers and voice.
- Front end reads only canonical tables (events, courts, matches, ...). Participants need no account and read published rows; public RLS is the visibility boundary.
- Staff area (announcement form only) sits behind sign-in; edits use authenticated server functions with database role checks, validated event-scoped payloads, and no service-role client. Why: route visibility never grants write access.
- UI strings live in src/lib/i18n.ts. Why: French can be added without touching components.
- Device follows use one namespaced local-storage key and a shared store hydrated after SSR; nothing is sent to the server.
- Home, Info and Sponsors share one event-scoped content query; announcements respect their active window and may target a division or hall (Home shows untargeted; team, court and schedule pages show matching ones).
- Search and team pages share one event-scoped directory query.
- Dark appearance, motion and control styling live in global semantic tokens, AppShell and UI Button; screens never use fixed colors.
- The Venue route owns the venue guide, directions, parking and food; courts keep a highlighted location preview.
- The assistant opens from a bottom-right "Ask me" button; its composer sits outside the scrolling transcript and exchanges live only in component state.
- Typed answers and voice use Lovable AI server-side only. Voice mode uses the Lovable Live relay at /api/live (src/lib/live-relay.server.ts) with client delegation to a read-only event-facts tool; its composer icon shows only when /api/public/voice-status reports the key. Why: no fake voice UI and no keys in the browser.
- Voice retrieval uses shared typed-chat facts with merged transcript fragments and recent speaker context; verified link objects reach the call UI. Why: spoken follow-ups and links must retain the same information as typed questions.
