import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Gift, MapPin } from "lucide-react";
import { eventContentQuery } from "@/lib/event-content";
import { venueQuery } from "@/lib/venue";
import { directionsUrl } from "@/lib/content-rules";
import { VenueMap, MapTextList } from "@/components/VenueMap";
import { EventInfoSections } from "@/components/EventInfoSections";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/venue")({
  loader: async ({ context }) => { await Promise.all([context.queryClient.ensureQueryData(eventContentQuery), context.queryClient.ensureQueryData(venueQuery)]); },
  head: () => ({ meta: [
    { title: "Venue & directions - OVAchamps" },
    { name: "description", content: "Venue guide, courts, directions, parking and food at the Ontario Championships." },
    { property: "og:title", content: "Venue & directions - OVAchamps" },
    { property: "og:description", content: "Find courts and venue facilities, directions and parking in one place." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: VenuePage,
  errorComponent: () => <p role="alert">{t.search.error}</p>,
});

function VenuePage() {
  const { data } = useSuspenseQuery(venueQuery);
  const { data: content } = useSuspenseQuery(eventContentQuery);
  const venue = content.event.venues;
  const google = directionsUrl("google", venue?.name, venue?.address);
  const apple = directionsUrl("apple", venue?.name, venue?.address);
  const pins = content.slots.filter((slot) => slot.placement === "map_pin" && slot.sponsors && slot.court_id);
  return <div className="min-w-0 space-y-6">
    <header><p className="text-sm text-muted-foreground">{content.event.name}</p><h1 className="mt-1 text-4xl font-bold uppercase">{t.schedule.venueTitle}</h1></header>
    <section className="space-y-3 border-y py-4"><h2 className="text-2xl font-bold uppercase">{venue?.name ?? t.info.venue}</h2>
      {venue?.address && <p className="flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4 shrink-0" aria-hidden />{venue.address}</p>}
      {(google || apple) && <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label={t.info.directions}>
        {apple && <Button asChild variant="outline" className="tap h-auto whitespace-normal"><a href={apple} target="_blank" rel="noopener noreferrer"><MapPin aria-hidden />{t.info.appleMaps}<span className="sr-only"> (opens in a new tab)</span></a></Button>}
        {google && <Button asChild variant="outline" className="tap h-auto whitespace-normal"><a href={google} target="_blank" rel="noopener noreferrer"><MapPin aria-hidden />{t.info.googleMaps}<span className="sr-only"> (opens in a new tab)</span></a></Button>}
      </div>}
    </section>
    <section aria-labelledby="map-title"><h2 id="map-title" className="mb-3 text-2xl font-bold uppercase">{t.map.title}</h2>
      <VenueMap areas={data.areas} courts={data.courts} width={data.venue.plan_width} height={data.venue.plan_height} floorPlan={data.venue.floor_plan_path} sponsorPins={pins} />
      {pins.length > 0 && <ul className="mt-2 space-y-1">{pins.map((slot) => <li key={slot.id}><Link to="/sponsors" hash={`slot-${slot.id}`} className="tap flex items-center gap-2 text-sm text-primary"><Gift className="h-4 w-4 text-accent" aria-hidden />{slot.headline ?? slot.sponsors?.name}</Link></li>)}</ul>}
    </section>
    <MapTextList areas={data.areas} courts={data.courts} />
    <EventInfoSections items={content.info.filter((item) => ["parking", "directions", "transport", "food"].includes(item.category))} />
    <Button asChild variant="outline" className="tap w-full"><Link to="/info">{t.info.title}</Link></Button>
  </div>;
}
