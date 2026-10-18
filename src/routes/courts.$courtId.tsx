import { appNow } from "@/lib/clock";
import { TargetedAnnouncements } from "@/components/TargetedAnnouncements";
import { ScheduleSkeleton } from "@/components/ScheduleSkeleton";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CourtScreen } from "@/components/CourtScreen";
import { ArrowLeft } from "lucide-react";
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
  head: ({ loaderData }) => ({ meta: [
    { title: loaderData ? `Court ${loaderData.label} — Courtside Connected` : "Court — Courtside Connected" },
    { name: "description", content: "What's playing now and next on this court, venue location and court-number lookup." },
    { property: "og:title", content: loaderData ? `Court ${loaderData.label}` : "Court" },
    { property: "og:description", content: "Find this court on the venue plan and see current and upcoming matches." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: CourtPage,
  pendingComponent: ScheduleSkeleton,
  pendingMs: 150,
  errorComponent: ({ error }) => <p role="alert">{error instanceof Error ? error.message : String(error)}</p>,
  notFoundComponent: () => <p role="alert">{t.court.notFound}</p>,
});

export function CourtPage() {
  const { courtId } = Route.useParams();
  const { data: v } = useSuspenseQuery(venueQuery);
  const { data: matches } = useSuspenseQuery(courtMatchesQuery(courtId));
  const [now, setNow] = useState(() => appNow());
  useEffect(() => { const timer = setInterval(() => setNow(appNow()), 30_000); return () => clearInterval(timer); }, []);
  const court = v.courts.find(c => c.id === courtId);
  if (!court) return <p role="alert">{t.court.notFound}</p>;
  return <div className="min-w-0 space-y-5">
    <Link to="/" className="tap inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />{t.court.back}</Link>
    <TargetedAnnouncements areaIds={court.area_id ? [court.area_id] : []} />
    <CourtScreen court={court} courts={v.courts} areas={v.areas} venue={v.venue} matches={matches}
      sources={matches[0]?.sources} savedAt={matches[0]?.offlineSavedAt} now={now} />
  </div>;
}
