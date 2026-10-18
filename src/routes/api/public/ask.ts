import { createFileRoute } from "@tanstack/react-router";
import { buildFacts, fallbackAnswer, parseAskRequest, sanitizeAnswer, SYSTEM_PROMPT } from "@/lib/ask-courtside";

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
          const facts = buildFacts({ ...data, staff }, content, body, body.now ?? Date.now());
          const key = process.env["ANTHROPIC_API_KEY"];
          if (!key) return Response.json({ ...fallbackAnswer(facts), mode: "basic" });
          const ask = () => fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
            body: JSON.stringify({ model: "claude-haiku-5-5", max_tokens: 900, system: SYSTEM_PROMPT, messages: [...body.history.flatMap((h) => [{ role: "user", content: h.question }, { role: "assistant", content: h.answer }]), { role: "user", content: `FACTS\n${facts.text}\nEND FACTS\n\nFan question: ${body.question}` }] }),
            signal: AbortSignal.timeout(12_000),
          });
          let reason = "";
          for (let attempt = 0; attempt < 2; attempt++) {
            try {
              const res = await ask();
              if (res.status === 429 || res.status >= 500) { reason = `model_${res.status}`; continue; } // one retry
              if (!res.ok) { reason = `model_${res.status}`; break; }
              const out = (await res.json()) as { content?: { type: string; text?: string }[]; stop_reason?: string };
              const text = out.content?.find((c) => c.type === "text")?.text?.trim();
              if (!text) { reason = "empty_answer"; break; }
              return Response.json({ ...sanitizeAnswer(text, facts.links, out.stop_reason === "max_tokens"), mode: "ai" });
            } catch (e) {
              reason = e instanceof Error && e.name === "TimeoutError" ? "timeout" : "network";
            }
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
