import { TargetedAnnouncements } from "@/components/TargetedAnnouncements";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { SourceBadges } from "@/components/SourceBadges";
import { ArrowLeft, Video } from "lucide-react";
import { VenueMap } from "@/components/VenueMap";
import { venueQuery, courtMatchesQuery } from "@/lib/venue";
import { t } from "@/lib/i18n";
export const Route = createFileRoute("/courts/$courtId")({
  loader: async ({ context, params }) => {
    const v = await context.queryClient.ensureQueryData(venueQuery);
    const court = v.courts.find((c) => c.id === params.courtId);
    if (!court) throw notFound();
    await context.queryClient.ensureQueryData(courtMatchesQuery(params.courtId));
    return { label: court.label };
  },
  head: ({ loaderData }) => ({ meta: [{ title: loaderData ? `Court ${loaderData.label} — Courtside Connected` : "Court — Courtside Connected" }, { name: "description", content: "What's playing now and next on this court, plus the live stream." }, { property: "og:title", content: loaderData ? `Court ${loaderData.label}` : "Court" }, { property: "og:description", content: "Now and next matches on this court." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: CourtPage, errorComponent: ({ error }) => <p role="alert">{error instanceof Error ? error.message : String(error)}</p>, notFoundComponent: () => <p role="alert">{t.court.notFound}</p>,
});
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-CA", { timeZone: "America/Toronto", hour: "numeric", minute: "2-digit" });
function CourtPage() {
  const { courtId } = Route.useParams();
  const { data: v } = useSuspenseQuery(venueQuery);
  const { data: matches } = useSuspenseQuery(courtMatchesQuery(courtId));
  const court = v.courts.find((c) => c.id === courtId);
  if (!court) return <p role="alert">{t.court.notFound}</p>;
  const area = v.areas.find((a) => a.id === court.area_id);
  const now = Date.now();
  const end = (m: (typeof matches)[number]) => new Date(m.start_at).getTime() + m.est_duration_min * 60000;
  const upcoming = matches.filter((m) => m.status !== "final" && end(m) > now);
  const current = upcoming.find((m) => new Date(m.start_at).getTime() <= now);
  const rest = upcoming.filter((m) => m !== current);
  const next = rest[0];
  const finals = matches.filter((m) => m.status === "final");
  return <div className="space-y-5"><Link to="/" className="tap inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" aria-hidden />{t.court.back}</Link>
    <header><p className="text-sm uppercase tracking-widest text-muted-foreground">{area?.name}</p><h1 className="text-5xl font-bold uppercase leading-none">{t.map.court} {court.label}</h1><SourceBadges matches={matches} sources={matches[0]?.sources} savedAt={matches[0]?.offlineSavedAt} /></header><TargetedAnnouncements areaIds={[court.area_id]} />
    {court.stream_url && <a href={court.stream_url} target="_blank" rel="noreferrer" className="tap flex items-center justify-center gap-2 rounded-xl bg-destructive p-3 font-semibold text-destructive-foreground"><Video className="h-5 w-5" aria-hidden />{t.court.watch}</a>}
    <Slot title={t.court.now} m={current} accent /><Slot title={t.court.next} m={next} />
    {rest.length > 1 && <section><h2 className="text-2xl font-bold uppercase">{t.court.later}</h2><ul className="mt-2 space-y-2">{rest.slice(1).map((m) => <li key={m.id}><MatchRow m={m} /></li>)}</ul></section>}
    {finals.length > 0 && <section><h2 className="text-2xl font-bold uppercase">{t.court.results}</h2><ul className="mt-2 space-y-2">{finals.map((m) => <li key={m.id}><MatchRow m={m} /></li>)}</ul></section>}
    <section aria-label={t.court.location}><h2 className="mb-2 text-2xl font-bold uppercase">{t.court.location}</h2><VenueMap areas={v.areas} courts={v.courts} width={v.venue.plan_width} height={v.venue.plan_height} highlightId={court.id} /></section>
  </div>;
  function Slot({ title, m, accent }: { title: string; m: (typeof matches)[number] | undefined; accent?: boolean }) {
    return <section><h2 className={`text-2xl font-bold uppercase ${accent ? "text-primary" : ""}`}>{title}</h2><div className="mt-2">{m ? <MatchRow m={m} /> : <p className="rounded-xl bg-card p-3 text-muted-foreground">{t.court.none}</p>}</div></section>;
  }
}
type M = { id: string; start_at: string; time_estimated?: boolean; home: { name: string } | null; away: { name: string } | null; results: { home_sets: number; away_sets: number } | { home_sets: number; away_sets: number }[] | null };
function MatchRow({ m }: { m: M }) {
  const r = Array.isArray(m.results) ? m.results[0] : m.results;
  return <div className="flex items-center gap-3 rounded-xl bg-card p-3"><span className="font-display text-xl font-bold">{time(m.start_at)}{m.time_estimated && <span className="block text-xs font-semibold text-muted-foreground">{t.schedule.estimatedShort}</span>}</span><span className="flex-1 text-sm">{m.home?.name ?? t.court.tbd} <span className="text-muted-foreground">{t.court.vs}</span> {m.away?.name ?? t.court.tbd}</span>{r && <span className="font-display text-lg font-bold">{r.home_sets}–{r.away_sets}</span>}</div>;
}
