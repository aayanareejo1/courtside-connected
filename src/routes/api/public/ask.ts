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
          const [data, content] = await Promise.all([readEventData(), readEventContent()]);
          const facts = buildFacts(data, content, body, body.now ?? Date.now());
          const key = process.env["ANTHROPIC_API_KEY"];
          if (!key) return Response.json({ ...fallbackAnswer(facts), mode: "basic" });
          try {
            const res = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
              body: JSON.stringify({ model: "claude-haiku-5-5", max_tokens: 400, system: SYSTEM_PROMPT, messages: [{ role: "user", content: `FACTS\n${facts.text}\nEND FACTS\n\nFan question: ${body.question}` }] }),
              signal: AbortSignal.timeout(12_000),
            });
            if (!res.ok) throw new Error(`model ${res.status}`);
            const out = (await res.json()) as { content?: { type: string; text?: string }[] };
            const text = out.content?.find((c) => c.type === "text")?.text?.trim();
            if (!text) throw new Error("empty answer");
            return Response.json({ ...sanitizeAnswer(text, facts.links), mode: "ai" });
          } catch (e) {
            console.error("Ask Courtside model failed", e);
            return Response.json({ ...fallbackAnswer(facts), mode: "basic" });
          }
        } catch (e) {
          console.error("Ask Courtside data failed", e);
          return Response.json({ error: "Event data is unavailable right now." }, { status: 503 });
        }
      },
    },
  },
});
