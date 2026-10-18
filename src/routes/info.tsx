import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Car, Hotel, Video, Utensils, Gift, Info, MapPin, ExternalLink } from "lucide-react";
import { eventContentQuery } from "@/lib/event-content";
import { venueQuery } from "@/lib/venue";
import { directionsUrl, safeExternalUrl } from "@/lib/content-rules";
import { RegisterButton } from "@/components/RegisterButton";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/info")({
  loader: async ({ context }) => { await Promise.all([context.queryClient.ensureQueryData(eventContentQuery), context.queryClient.ensureQueryData(venueQuery)]); },
  head: () => ({ meta: [
    { title: "Event info — Courtside Connected" },
    { name: "description", content: "Parking, hotels, streaming, food and other event links." },
    { property: "og:title", content: "Event info — Courtside Connected" },
    { property: "og:description", content: "Parking, hotels, streaming, food and other event links." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: InfoPage,
  errorComponent: () => <p role="alert">{t.search.error}</p>,
});

function InfoPage() {
  const { data } = useSuspenseQuery(eventContentQuery);
  const { data: map } = useSuspenseQuery(venueQuery);
  const categories = Array.from(new Set(data.info.map((item) => item.category)));
  const venue = data.event.venues;
  const google = directionsUrl("google", venue?.name, venue?.address);
  const apple = directionsUrl("apple", venue?.name, venue?.address);
  const icons: Record<string, typeof Info> = { parking: Car, hotel: Hotel, streaming: Video, food: Utensils, raffle: Gift };
  return <div className="space-y-6">
    <header><p className="text-sm text-muted-foreground">{data.event.name}</p><h1 className="text-4xl font-bold uppercase">{t.info.title}</h1></header>
    <section className="space-y-2"><h2 className="text-2xl font-bold uppercase">{t.info.about}</h2><p className="text-muted-foreground">{t.info.aboutText}</p></section>
    <section className="space-y-2 border-y py-4"><h2 className="text-2xl font-bold uppercase">{data.event.venues?.name ?? t.info.venue}</h2>{data.event.venues?.address && <p className="flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4 shrink-0" aria-hidden />{data.event.venues.address}</p>}
      {(google || apple) && <div className="flex flex-wrap gap-2" role="group" aria-label={t.info.directions}>
        {apple && <Button asChild variant="outline" className="tap"><a href={apple} target="_blank" rel="noopener noreferrer"><MapPin aria-hidden />{t.info.directions}: {t.info.appleMaps}<span className="sr-only"> (opens in a new tab)</span></a></Button>}
        {google && <Button asChild variant="outline" className="tap"><a href={google} target="_blank" rel="noopener noreferrer"><MapPin aria-hidden />{t.info.directions}: {t.info.googleMaps}<span className="sr-only"> (opens in a new tab)</span></a></Button>}
      </div>}
      <Button asChild variant="link" className="tap p-0"><Link to="/">{t.info.map}</Link></Button>
      {map.areas.length > 0 && <div><h3 className="font-sans text-sm font-semibold">{t.info.areas}</h3><ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">{map.areas.map((area) => <li key={area.id}>{area.name}</li>)}</ul></div>}
    </section>
    <RegisterButton url={data.event.registration_url} live={data.event.registration_live} />
    {!data.info.length && <p className="text-muted-foreground">{t.info.empty}</p>}
    {categories.map((category) => { const Icon = icons[category] ?? Info; const label = t.info.categories[category as keyof typeof t.info.categories] ?? t.info.categories.other; return <section key={category} className="space-y-3"><h2 className="flex items-center gap-2 text-2xl font-bold uppercase"><Icon className="h-5 w-5 text-primary" aria-hidden />{label}</h2><ul className="divide-y">{data.info.filter((item) => item.category === category).map((item) => { const url = safeExternalUrl(item.url); return <li key={item.id} className="py-3"><h3 className="font-sans text-base font-semibold">{item.title}</h3>{item.description && <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>}{url && <Button asChild variant="link" className="tap mt-1 h-auto justify-start whitespace-normal p-0"><a href={url} target="_blank" rel="noopener noreferrer" aria-label={`${t.info.open}: ${item.title}`}>{t.info.open}<ExternalLink aria-hidden /></a></Button>}</li>; })}</ul></section>; })}
    <p className="border-t pt-4 text-sm"><Link to="/staff" className="tap inline-flex items-center text-muted-foreground underline">{t.admin.brandLink}</Link></p>
  </div>;
}
