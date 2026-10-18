import { MatchTime, MatchScore } from "@/components/MatchDetails";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Video } from "lucide-react";
import { VenueMap, type MapArea, type MapCourt } from "@/components/VenueMap";
import { SourceBadges } from "@/components/SourceBadges";
import type { MatchSource } from "@/lib/source-status";
import { courtSchedule, courtsByNumber, hasMapPosition, type CourtMatch } from "@/lib/court-schedule";
import { eventDateLabel } from "@/lib/schedule";
import { t } from "@/lib/i18n";

export type CourtScreenMatch = CourtMatch & { source_id?: string | null; time_estimated?: boolean;
  home: { name: string } | null; away: { name: string } | null;
  results: { home_sets: number; away_sets: number } | { home_sets: number; away_sets: number }[] | null };

export function CourtScreen({ court, courts, areas, venue, matches, sources, savedAt, now }: {
  court: MapCourt; courts: MapCourt[]; areas: MapArea[]; venue: { plan_width: number; plan_height: number; floor_plan_path?: string | null };
  matches: CourtScreenMatch[]; sources?: MatchSource[] | undefined; savedAt?: number | null | undefined; now: number;
}) {
  const [number, setNumber] = useState("");
  const area = areas.find(a => a.id === court.area_id);
  const schedule = courtSchedule(matches, now);
  const found = courtsByNumber(courts, number);
  return <div className="min-w-0 space-y-5">
    <section aria-label={t.court.find}>
      <label htmlFor="court-number" className="mb-2 block font-semibold">{t.court.find}</label>
      <input id="court-number" type="search" inputMode="numeric" value={number} onChange={e => setNumber(e.target.value)} placeholder={t.court.number}
        className="tap w-full min-w-0 rounded-lg border bg-background px-3 py-2 text-base" />
      <nav aria-label={t.map.listTitle} className="mt-2">
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {found.map(c => <li key={c.id} className="min-w-0"><Link to="/courts/$courtId" params={{ courtId: c.id }} aria-current={c.id === court.id ? "page" : undefined}
            className={`tap flex items-center justify-center rounded-lg border px-2 py-2 text-center font-semibold ${c.id === court.id ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>
            <span className="min-w-0 break-words">{t.map.court} {c.label}</span>
          </Link></li>)}
        </ul>
        {!found.length && <p role="status" className="mt-2 text-muted-foreground">{t.court.noCourt}</p>}
      </nav>
    </section>
    <header className="min-w-0">
      <p className="break-words text-sm uppercase text-muted-foreground">{area?.name}</p>
      <h1 className="break-words text-4xl font-bold uppercase leading-none">{t.map.court} {court.label}</h1>
    </header>
    <section aria-label={t.court.location}>
      <h2 className="mb-2 text-2xl font-bold uppercase">{t.court.location}{area && <span className="ml-2 text-lg text-muted-foreground">{area.name}</span>}</h2>
      {hasMapPosition(court) ? <VenueMap key={court.id} areas={areas} courts={courts} width={venue.plan_width} height={venue.plan_height} floorPlan={venue.floor_plan_path} highlightId={court.id} />
        : <p className="text-sm text-muted-foreground">{t.court.noPosition}</p>}
    </section>
    {court.stream_url && <a href={court.stream_url} target="_blank" rel="noreferrer" className="tap flex items-center justify-center gap-2 rounded-lg bg-destructive p-3 font-semibold text-destructive-foreground"><Video className="h-5 w-5 shrink-0" aria-hidden />{t.court.watch}</a>}
    <SourceBadges matches={matches} sources={sources} savedAt={savedAt} />
    <section aria-label={t.court.comingUp}>
      <h2 className="mb-2 text-2xl font-bold uppercase">{t.court.comingUp}</h2>
      {schedule.featured ? <div className="border-l-2 border-primary pl-3"><MatchRow m={schedule.featured} featured /></div> : <p className="text-muted-foreground">{t.court.none}</p>}
      {schedule.nextThree.length > 0 && <ul className="mt-2 space-y-2">{schedule.nextThree.map(m => <li key={m.id}><MatchRow m={m} /></li>)}</ul>}
    </section>
    {!!schedule.finals.length && <section aria-label={t.court.results}>
      <h2 className="mb-2 text-2xl font-bold uppercase">{t.court.results}</h2>
      <ul className="space-y-2">{schedule.finals.map(m => <li key={m.id}><MatchRow m={m} /></li>)}</ul>
    </section>}
  </div>;
}

function MatchRow({ m, featured = false }: { m: CourtScreenMatch; featured?: boolean }) {
  const r = Array.isArray(m.results) ? m.results[0] : m.results;
  return <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg bg-card p-3">
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{eventDateLabel(m.start_at)}{m.status === "live" ? ` · ${t.team.live}` : ""}</p>
      <MatchTime value={m.start_at} estimated={m.time_estimated} className={featured ? "font-display text-3xl font-bold text-primary" : "font-display text-xl font-bold"} />
      {m.time_estimated && <span className="ml-2 text-xs text-muted-foreground">{t.schedule.estimatedShort}</span>}
      <p className="mt-1 break-words text-sm">{m.home?.name ?? t.court.tbd} <span className="text-muted-foreground">{t.court.vs}</span> {m.away?.name ?? t.court.tbd}</p>
    </div>
    {r ? <MatchScore home={m.home?.name ?? t.court.tbd} away={m.away?.name ?? t.court.tbd} homeSets={r.home_sets} awaySets={r.away_sets} final={m.status === "final"} className="shrink-0 font-display text-lg font-bold" /> : m.status === 'final' ? <span className="max-w-24 text-xs text-muted-foreground">{t.schedule.resultPending}</span> : null}
  </div>;
}
