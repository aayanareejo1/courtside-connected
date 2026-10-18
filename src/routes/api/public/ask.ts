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
          const key = process.env["LOVABLE_API_KEY"];
          if (!key) return Response.json({ ...fallbackAnswer(facts), mode: "basic" });
          const [{ createOpenAI }, { streamText }] = await Promise.all([import("@ai-sdk/openai"), import("ai")]);
          // Reuse the gateway-issued run id across SDK steps; never minted here.
          let runId: string | undefined;
          const provider = createOpenAI({
            baseURL: "https://ai.gateway.lovable.dev/v1",
            apiKey: key,
            headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
            fetch: async (input, init) => {
              const headers = new Headers(init?.headers);
              if (runId) headers.set("X-Lovable-AIG-Run-ID", runId);
              const res = await fetch(input, { ...init, headers });
              runId ??= res.headers.get("X-Lovable-AIG-Run-ID")?.trim() || undefined;
              return res;
            },
          });
          let reason = "";
          try {
            const result = streamText({
              model: provider.responses("openai/gpt-6-astra"),
              maxRetries: 1, // one bounded retry for 429/5xx
              maxOutputTokens: 900,
              abortSignal: request.signal,
              system: SYSTEM_PROMPT,
              messages: [
                ...body.history.flatMap((h) => [{ role: "user" as const, content: h.question }, { role: "assistant" as const, content: h.answer }]),
                { role: "user" as const, content: `FACTS\n${facts.text}\nEND FACTS\n\nFan question: ${body.question}` },
              ],
              providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] } },
            });
            let failed = false;
            for await (const part of result.fullStream) if (part.type === "error") { failed = true; reason = "model_error"; }
            const text = failed ? "" : (await result.text).trim();
            if (text) return Response.json({ ...sanitizeAnswer(text, facts.links, (await result.finishReason) === "length"), mode: "ai" });
            reason ||= "empty_answer";
          } catch (e) {
            reason = e instanceof Error ? e.name : "network";
          }
          console.error("Ask OVAchamps model failed", reason);
          return Response.json({ ...fallbackAnswer(facts), mode: "basic", reason });
        } catch (e) {
          console.error("Ask Courtside data failed", e);
          return Response.json({ error: "Event data is unavailable right now." }, { status: 503 });
        }
      },
    },
  },
});
