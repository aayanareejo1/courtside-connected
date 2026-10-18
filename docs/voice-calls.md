# OVAchamps voice calls - next integration

Status: researched, not enabled. No simulated call button is shown to fans.

## Hosting prerequisite

The current app deploys independently to Cloudflare Workers. Text answers use the existing server-only Anthropic key. Real voice calls need a Lovable-managed server-only `LOVABLE_API_KEY` provisioned for the actual deployed app. The key in the separate Lovable builder must not be copied into this repository, its browser bundle, or a different app's deployment. An authorized host integration must provision credentials securely before call verification.

## Implementation

- Keep the existing text endpoint, model, follows, clock and answer rules unchanged.
- Add a persistent same-origin `/api/live` WebSocket relay in the server entry, with a strict request-origin check. Both browser-to-server and server-to-gateway control sockets remain open for the full call.
- Use Lovable Live `openai/gpt-live-1` with client delegation. Delegate questions to server-owned event retrieval; use the existing canonical facts and calendar rules, not invented schedules. New backend reasoning uses the supported Responses SDK contract.
- Start only from an explicit call button. Request microphone permission then. Offer microphone mute, end call, playback recovery, connecting/error states and live captions. The voice companion greets the fan once audio is ready.
- Use the maintained Live hook and relay lifecycle: one-second heartbeats after media readiness, startup grace, abort on end, bounded final usage drain, and cleanup on navigation or tab exit. Do not restart failed paid sessions automatically.
- Show safe provider errors; stop terminal access failures. Keep usage/session correlation server-owned.
- Call transcripts stay in memory for the active visit. Clearly disclose microphone audio goes to the voice service only during the call. Device follows are not uploaded unless explicitly needed and disclosed for a fan's requested schedule answer.

## Acceptance checks before enabling

Verify actual audible back-and-forth and event answers on preview and the published app, correction of a team name, interruption, mute, ending during startup/playback, denied microphone permission, provider denial, route/tab cleanup, and correlated final usage. HTTP 101 or a connected label alone is insufficient. Use the bundled Lovable Live relay, hook and Vite adapter, not browser speech recognition or synthetic demo audio.