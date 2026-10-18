import { HomeOverview } from "@/components/HomeOverview";
import { eventDataQuery } from "@/lib/event-data";
import { SourceBadges } from "@/components/SourceBadges";
import { ScheduleSkeleton } from "@/components/ScheduleSkeleton";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { t } from "@/lib/i18n";
import { VenueMap, MapTextList } from "@/components/VenueMap";
import { venueQuery } from "@/lib/venue";
import { eventContentQuery } from "@/lib/event-content";
import { generalAnnouncements } from "@/lib/content-rules";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { SponsorCard } from "@/components/SponsorCard";
import { Gift, Search, MapPin } from "lucide-react";
import { RegisterButton } from "@/components/RegisterButton";
import { Button } from "@/components/ui/button";

function HomeMap() {
  const { data } = useSuspenseQuery(venueQuery);
  const { data: content } = useSuspenseQuery(eventContentQuery);
  const pins = content.slots.filter((slot) => slot.placement === "map_pin" && slot.sponsors && slot.court_id);
  return (
    <>
      <section aria-labelledby="map-title">
        <h2 id="map-title" className="text-2xl font-bold uppercase">{t.map.title}</h2>
        <VenueMap areas={data.areas} courts={data.courts} width={data.venue.plan_width} height={data.venue.plan_height} floorPlan={data.venue.floor_plan_path} sponsorPins={pins} />
        {pins.length > 0 && <ul className="mt-2 space-y-1">{pins.map((slot) => <li key={slot.id}><Link to="/sponsors" hash={`slot-${slot.id}`} className="tap flex items-center gap-2 text-sm text-primary"><Gift className="h-4 w-4 text-accent" aria-hidden />{slot.headline ?? slot.sponsors?.name}</Link></li>)}</ul>}
      </section>
      <MapTextList areas={data.areas} courts={data.courts} />
    </>
  );
}

export const Route = createFileRoute("/")({
  loader: async ({ context }) => { await Promise.all([context.queryClient.ensureQueryData(eventContentQuery), context.queryClient.ensureQueryData(venueQuery), context.queryClient.ensureQueryData(eventDataQuery)]); },
  head: () => ({ meta: [
    { title: "Courtside Connected — OVA participant companion" },
    { name: "description", content: "Find players, teams, courts and venue information at Ontario Volleyball Association events." },
    { property: "og:title", content: "Courtside Connected — OVA participant companion" },
    { property: "og:description", content: "Find people and places, follow teams and view your event schedule." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Home,
  pendingComponent: ScheduleSkeleton,
  pendingMs: 150,
  notFoundComponent: () => <p role="alert">{t.search.error}</p>,
  errorComponent: () => <p role="alert">{t.search.error}</p>,
});

function Home() {
  const { data } = useSuspenseQuery(eventContentQuery);
  const { data: directory } = useSuspenseQuery(eventDataQuery);
  const { event } = data;
  const venue = event.venues as unknown as { name: string; courts: { count: number }[] } | null;

  return (
    <div className="space-y-8">
      <section className="event-heading py-3 pl-5 text-foreground">
        <p className="text-xs font-semibold uppercase text-primary">{venue?.name}</p>
        <h1 className="mt-3 text-4xl font-bold uppercase leading-tight sm:text-5xl">{event.name}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{event.starts_on} – {event.ends_on} · {venue?.courts?.[0]?.count ?? 0} {t.home.courts}</p>
      </section>

      <HomeOverview data={directory} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button asChild className="h-auto min-h-12 whitespace-normal"><Link to="/search" search={{ q: "" }}><Search className="shrink-0" aria-hidden />{t.home.findPeople}</Link></Button>
        <Button asChild variant="outline" className="h-auto min-h-12 whitespace-normal"><Link to="/info"><MapPin className="shrink-0" aria-hidden />{t.home.findPlaces}</Link></Button>
      </div>
      <RegisterButton url={event.registration_url} live={event.registration_live} />
      {(() => { const all = generalAnnouncements(data.announcements); const recent = new Set([...all].sort((a, b) => Date.parse(b.created_at ?? "") - Date.parse(a.created_at ?? "")).slice(0, 3).map((a) => a.id)); const shown = all.filter((a) => recent.has(a.id)); return shown.length ? <div><AnnouncementBanner announcements={shown} />{all.length > 3 && <Link to="/announcements" className="tap inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline">{t.announcements.seeAll}</Link>}</div> : null; })()}
      <HomeMap />
      {data.slots.filter((slot) => slot.placement === "banner" && slot.sponsors).map((slot) => <SponsorCard key={slot.id} slot={slot} />)}

      <section aria-labelledby="days">
        <h2 id="days" className="text-2xl font-bold uppercase">{t.home.days}</h2>
        <ul className="mt-2 space-y-2">
          {event.event_days.map((d) => {
            const sources = d.day_division_sources.flatMap((row) => row.sources ? [row.sources] : []);
            const identified = sources.map((source, index) => ({ ...source, id: `${d.id}-${index}` }));
            return <li key={d.id} className="rounded-lg border bg-card p-4">
              <p className="font-semibold">{d.label} <span className="font-normal text-muted-foreground">{d.date}</span></p>
              <SourceBadges matches={identified.length ? identified.map((source) => ({ source_id: source.id })) : [{}]} sources={identified} savedAt={data.offlineSavedAt} />
            </li>;
            })}
          </ul>
        </section>
      </div>
    );
}
