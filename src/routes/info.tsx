import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { MapPin, Gift } from "lucide-react";
import { eventContentQuery } from "@/lib/event-content";
import { EventInfoSections } from "@/components/EventInfoSections";
import { RegisterButton } from "@/components/RegisterButton";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/info")({
  loader: ({ context }) => context.queryClient.ensureQueryData(eventContentQuery),
  head: () => ({ meta: [
    { title: "Event info - OVAchamps" },
    { name: "description", content: "Registration, hotels, streaming, tickets and other Ontario Championships event links." },
    { property: "og:title", content: "Event info - OVAchamps" },
    { property: "og:description", content: "Registration, hotels, streaming, tickets and other Ontario Championships event links." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: InfoPage,
  errorComponent: () => <p role="alert">{t.search.error}</p>,
});

function InfoPage() {
  const { data } = useSuspenseQuery(eventContentQuery);
  return <div className="space-y-6">
    <header><p className="text-sm text-muted-foreground">{data.event.name}</p><h1 className="text-4xl font-bold uppercase">{t.info.title}</h1></header>
    <section className="space-y-2"><h2 className="text-2xl font-bold uppercase">{t.info.about}</h2><p className="text-muted-foreground">{t.info.aboutText}</p></section>
    <div className="grid gap-2 sm:grid-cols-2"><Button asChild variant="outline" className="tap h-auto whitespace-normal"><Link to="/venue"><MapPin aria-hidden />{t.schedule.venueTitle}</Link></Button><Button asChild variant="outline" className="tap h-auto whitespace-normal"><Link to="/sponsors"><Gift aria-hidden />{t.sponsors.title}</Link></Button></div>
    <RegisterButton url={data.event.registration_url} live={data.event.registration_live} />
    {!data.info.length && <p className="text-muted-foreground">{t.info.empty}</p>}
    <EventInfoSections items={data.info.filter((item) => !["parking", "directions", "transport", "food"].includes(item.category))} />
    <p className="border-t pt-4 text-sm"><Link to="/staff" className="tap inline-flex items-center text-muted-foreground underline">{t.admin.brandLink}</Link></p>
  </div>;
}
