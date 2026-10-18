import { createFileRoute } from "@tanstack/react-router";
import { AskCourtside } from "@/components/AskCourtside";

export const Route = createFileRoute("/ask")({
  validateSearch: (s: Record<string, unknown>): { q?: string } => (typeof s["q"] === "string" && s["q"] ? { q: s["q"].slice(0, 300) } : {}),
  head: () => ({ meta: [
    { title: "Ask Courtside — Courtside Connected" },
    { name: "description", content: "Ask where a team plays, when to leave, tickets, parking and more at this OVA event." },
    { property: "og:title", content: "Ask Courtside — Courtside Connected" },
    { property: "og:description", content: "Quick answers about this event from the event's own information." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: AskPage,
});

function AskPage() {
  const { q } = Route.useSearch();
  return <div className="space-y-4">
    <h1 className="text-4xl font-bold uppercase">Ask Courtside</h1>
    <AskCourtside initialQuestion={q} />
  </div>;
}
