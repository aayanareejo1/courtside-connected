import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { eventContentQuery } from "@/lib/event-content";
import { SponsorCard } from "@/components/SponsorCard";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/sponsors")({
  loader: ({ context }) => context.queryClient.ensureQueryData(eventContentQuery),
  head: () => ({ meta: [
    { title: "Sponsors and offers — Courtside Connected" },
    { name: "description", content: "Event sponsors and offers for OVA families." },
    { property: "og:title", content: "Sponsors and offers — Courtside Connected" },
    { property: "og:description", content: "Event sponsors and offers for OVA families." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: SponsorsPage,
  errorComponent: () => <p role="alert">{t.search.error}</p>,
});

function SponsorsPage() {
  const { data } = useSuspenseQuery(eventContentQuery);
  const slots = data.slots.filter((slot) => slot.sponsors);
  const partners = slots.filter((slot) => slot.placement === "section" || slot.placement === "banner");
  const offers = slots.filter((slot) => slot.placement === "offer" || slot.placement === "map_pin");
  const demo = slots.some((slot) => { try { return new URL(slot.sponsors?.url ?? "").hostname === "example.com"; } catch { return false; } });
  return <div className="space-y-6"><header><p className="text-sm text-muted-foreground">{data.event.name}</p><h1 className="text-4xl font-bold uppercase">{t.sponsors.title}</h1></header>
    {demo && <p className="border-l-4 border-accent bg-accent/15 p-3 text-sm text-accent-foreground">{t.sponsors.demo}</p>}
    {!slots.length && <p className="text-muted-foreground">{t.sponsors.empty}</p>}
    {[[t.sponsors.partners, partners], [t.sponsors.offers, offers]].map(([label, rows]) => { const items = rows as typeof slots; return items.length > 0 && <section key={label as string} className="space-y-3"><h2 className="text-2xl font-bold uppercase">{label as string}</h2><div className="grid gap-3">{items.map((slot) => <SponsorCard key={slot.id} slot={slot} />)}</div></section>; })}
  </div>;
}
