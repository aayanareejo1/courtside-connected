import { createFileRoute } from "@tanstack/react-router";
import { buildFacts, fallbackAnswer, parseAskRequest } from "@/lib/ask-courtside";
import { runAgent, type CallModel, type ModelReply } from "@/lib/ask-tools";

// Simple per device limit. Workers isolates reset it, so it only slows casual abuse; the question length is capped too.
const hits = new Map<string, number[]>();
const limited = (ip: string, now: number) => {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 8;
};

export const Route = createFileRoute("/api/public/ask")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = parseAskRequest(await request.json().catch(() => null));
        if (!body) return Response.json({ error: "Ask a question of 300 characters or fewer." }, { status: 400 });
        if (limited(request.headers.get("cf-connecting-ip") ?? "local", Date.now())) return Response.json({ error: "Please wait a minute and try again." }, { status: 429 });
        try {
          const { readEventData } = await import("@/lib/event-data");
          const { readEventContent } = await import("@/lib/event-content");
          const { supabase } = await import("@/integrations/supabase/client");
          const [data, content, staff] = await Promise.all([
            readEventData(), readEventContent(),
            // Coaches are public on the team page. If this read fails the answer simply leaves them out.
            Promise.resolve(supabase.from("staff_members").select("team_id,display_name,role").limit(2000)).then((r) => r.data ?? []).catch(() => []),
          ]);
          const now = body.now ?? Date.now();
          const facts = buildFacts({ ...data, staff }, content, body, now);
          const key = process.env["ANTHROPIC_API_KEY"];
          if (!key) return Response.json({ ...fallbackAnswer(facts), mode: "basic" });
          let reason = "";
          const started = Date.now();
          // One model call, retried once on a busy or failing service.
          const callModel: CallModel = async (system, messages, tools) => {
            for (let attempt = 0; attempt < 2; attempt++) {
              if (Date.now() - started > 22_000) { reason = "timeout"; break; } // the whole answer, not one call
              try {
                const res = await fetch("https://api.anthropic.com/v1/messages", {
                  method: "POST",
                  headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
                  body: JSON.stringify({ model: "claude-haiku-5-5", max_tokens: 900, system, messages, tools }),
                  signal: AbortSignal.timeout(12_000),
                });
                if (res.status === 429 || res.status >= 500) { reason = `model_${res.status}`; continue; }
                if (!res.ok) { reason = `model_${res.status}`; break; }
                return (await res.json()) as ModelReply;
              } catch (e) {
                reason = e instanceof Error && e.name === "TimeoutError" ? "timeout" : "network";
              }
            }
            throw new Error(reason || "model_failed");
          };
          try {
            const out = await runAgent({ callModel, question: body.question, history: body.history, ctx: { data: { ...data, staff }, content, follows: body.follows, now } });
            if (out) return Response.json({ ...out, mode: "ai" });
            reason = "empty_answer";
          } catch (e) {
            reason ||= e instanceof Error ? e.message : "model_failed";
          }
          console.error("Ask Courtside model failed", reason);
          return Response.json({ ...fallbackAnswer(facts), mode: "basic", reason });
        } catch (e) {
          console.error("Ask Courtside data failed", e);
          return Response.json({ error: "Event data is unavailable right now." }, { status: 503 });
        }
      },
    },
  },
});
