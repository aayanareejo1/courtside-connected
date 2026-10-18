import { createFileRoute } from "@tanstack/react-router";

// Tells the chat whether real voice calls are switched on. Never returns the key itself.
export const Route = createFileRoute("/api/public/voice-status")({
  server: {
    handlers: {
      GET: async () => Response.json({ available: Boolean(process.env["LOVABLE_API_KEY"]) }, { headers: { "cache-control": "no-store" } }),
    },
  },
});
