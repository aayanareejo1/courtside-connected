import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/jobs/sync-sources")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { adapters } = await import("@/server/adapters");
        const { applySync } = await import("@/server/apply-sync");
        const { data: sources, error } = await supabaseAdmin.from("sources").select("id,kind,name,config");
        if (error) return Response.json({ success: false }, { status: 500 });
        const summary: { source: string; status: string }[] = [];
        for (const source of sources ?? []) {
          const adapter = (adapters as Record<string, import("@/server/adapters").SourceAdapter>)[source.kind];
          if (!adapter) continue;
          const started = new Date().toISOString();
          try {
            const result = adapter.map(await adapter.fetch(source as never));
            const rows = await applySync(supabaseAdmin, source.id, result);
            const now = new Date().toISOString();
            await supabaseAdmin.from("source_runs").insert({ source_id: source.id, started_at: started, finished_at: now, status: "ok", rows_upserted: rows });
            await supabaseAdmin.from("sources").update({ last_status: "ok", last_success_at: now }).eq("id", source.id);
            summary.push({ source: source.kind, status: "ok" });
          } catch (e) {
            // Keep last known data: last_success_at is untouched on failure.
            await supabaseAdmin.from("source_runs").insert({ source_id: source.id, started_at: started, finished_at: new Date().toISOString(), status: "error", rows_upserted: 0, error: e instanceof Error ? e.message : "failed" });
            await supabaseAdmin.from("sources").update({ last_status: "error" }).eq("id", source.id);
            summary.push({ source: source.kind, status: "error" });
          }
        }
        return Response.json({ success: true, summary });
      },
    },
  },
});
