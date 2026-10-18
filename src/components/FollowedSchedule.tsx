import { MatchTime, MatchScore } from "@/components/MatchDetails";
import { SourceBadges } from "@/components/SourceBadges";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Clock, MapPin } from "lucide-react";
import { recommendedArrivalTime, clashes, tightTurnaround, FAN_WARMUP_MINUTES, FAN_WALK_MINUTES, eventDateKey, eventDateLabel, eventTime } from "@/lib/schedule";
import { t } from "@/lib/i18n";
import type { EventData } from "@/lib/event-data";

export function FollowedSchedule({ data, matches, results = false }: { data: EventData; matches: EventData["matches"]; results?: boolean }) {
  const groups = new Map<string, EventData["matches"]>();
  for (const match of matches) {
    const key = eventDateKey(match.start_at);
    groups.set(key, [...(groups.get(key) ?? []), match]);
  }
  if (!matches.length) return <p className="py-5 text-muted-foreground">{results ? t.schedule.noResults : t.schedule.noUpcoming}</p>;
  return <div className="space-y-6"><SourceBadges matches={matches} sources={data.sources} savedAt={data.offlineSavedAt} />{Array.from(groups.entries()).map(([day, rows]) => <section key={day}>
    <h2 className="mb-3 border-b pb-2 text-2xl font-bold uppercase">{eventDateLabel(rows[0]?.start_at ?? day)}</h2>
    <ul className="space-y-3">{rows.map((m) => {
      const conflicts = results ? [] : matches.filter((other) => clashes(m, other, FAN_WARMUP_MINUTES, FAN_WALK_MINUTES));
      const tight = results ? [] : matches.filter((other) => tightTurnaround(m, other));
      const court = data.courts.find((c) => c.id === m.court_id);
      const home = data.teams.find((team) => team.id === m.home_team_id);
      const away = data.teams.find((team) => team.id === m.away_team_id);
      const score = Array.isArray(m.results) ? m.results[0] : m.results;
      const courtLabel = court ? `${t.map.court} ${court.label}` : m.court_label_raw ?? t.schedule.courtUnknown;
      return <li key={m.id} className={`overflow-hidden rounded-lg border bg-card ${conflicts.length || tight.length ? "border-accent" : ""}`}>
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-xs uppercase text-muted-foreground">{t.schedule.start}</p><MatchTime value={m.start_at} estimated={m.time_estimated} className="font-display text-3xl font-bold" />{m.time_estimated && <p className="text-sm font-semibold text-muted-foreground">{t.schedule.estimated}</p>}</div>
            {!results && m.status !== "cancelled" && <div className="text-right text-primary"><p className="flex items-center justify-end gap-1 text-xs"><Clock className="h-3 w-3" aria-hidden />{t.schedule.arrive}</p><MatchTime value={recommendedArrivalTime(m.start_at)} arrival className="font-display text-3xl font-bold" /></div>}
            {results && (score ? <MatchScore home={home?.name ?? t.court.tbd} away={away?.name ?? t.court.tbd} homeSets={score.home_sets} awaySets={score.away_sets} final className="font-display text-3xl font-bold" /> : <span className="text-sm text-muted-foreground">{t.schedule.resultPending}</span>)}
          </div>
          <div className="space-y-1 text-sm font-semibold">{home ? <Link className="tap flex items-center break-words" to="/teams/$teamId" params={{ teamId: home.id }}>{home.name}</Link> : <p>{t.court.tbd}</p>}<p className="text-xs font-normal text-muted-foreground">{t.court.vs}</p>{away ? <Link className="tap flex items-center break-words" to="/teams/$teamId" params={{ teamId: away.id }}>{away.name}</Link> : <p>{t.court.tbd}</p>}</div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">{court ? <Link className="tap inline-flex items-center gap-1 text-primary" to="/courts/$courtId" params={{ courtId: court.id }}><MapPin className="h-4 w-4" aria-hidden />{courtLabel}</Link> : <span>{courtLabel}</span>}<span className="text-muted-foreground">{m.status === "final" ? t.team.final : m.status === "live" ? t.team.live : m.status === "cancelled" ? t.schedule.cancelled : t.team.scheduled}</span></div>
        </div>
        {tight.length > 0 && <div className="space-y-1 bg-accent/10 px-4 py-3 text-foreground"><p className="flex items-center gap-2 text-sm font-bold"><AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />{t.schedule.tightTurnaround}</p>{tight.map((other) => { const otherCourt = data.courts.find((c) => c.id === other.court_id); return <p key={other.id} className="text-sm">{eventTime(other.start_at)} · {otherCourt ? `${t.map.court} ${otherCourt.label}` : other.court_label_raw ?? t.schedule.courtUnknown}</p>; })}</div>}
        {conflicts.length > 0 && <div className="space-y-1 bg-accent/10 px-4 py-3 text-foreground"><p className="flex items-center gap-2 text-sm font-bold"><AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />{t.schedule.clash}</p>{conflicts.map((other) => { const otherCourt = data.courts.find((c) => c.id === other.court_id); return <p key={other.id} className="text-sm">{t.schedule.clashWith} {eventTime(other.start_at)} · {otherCourt ? `${t.map.court} ${otherCourt.label}` : other.court_label_raw ?? t.schedule.courtUnknown}</p>; })}</div>}
      </li>;
    })}</ul>
  </section>)}</div>;
}
