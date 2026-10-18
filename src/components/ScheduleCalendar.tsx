// buildCalendar owns all event times and conflict guidance. Both views render its output.
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, BellRing, CalendarDays, CalendarPlus, Clock, Flag, List } from "lucide-react";
import { buildCalendar, toIcs, downloadIcs, type CalendarMatch } from "@/lib/calendar";
import { calendarLanes } from "@/lib/calendar-layout";
import { eventDateLabel, eventTime } from "@/lib/schedule";
import { appNow } from "@/lib/clock";
import type { Follow } from "@/lib/follows";
import type { EventData } from "@/lib/event-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/i18n";

type Match = EventData["matches"][number];
const SWATCHES = ["bg-follow-1", "bg-follow-2", "bg-follow-3", "bg-follow-4", "bg-follow-5", "bg-follow-6"];
const BORDERS = ["border-follow-1", "border-follow-2", "border-follow-3", "border-follow-4", "border-follow-5", "border-follow-6"];
const PX_PER_MIN = 3.5;
function torontoMinutes(iso: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}
const hourLabel = (h: number) => `${((h + 11) % 12) + 1} ${h < 12 ? "a.m." : "p.m."}`;
type Labels = { colourOf: (m: Match) => number; courtLabel: (m: Match) => string; opponent: (m: Match) => string; followedLabel: (m: Match) => string };

export function ScheduleCalendar({ data, matches, follows }: { data: EventData; matches: Match[]; follows: Follow[] }) {
  const days = buildCalendar(matches);
  const [day, setDay] = useState(0);
  const [view, setView] = useState<"agenda" | "day">("agenda");
  const followTeams = follows.map((f) => ({ follow: f, teamId: f.type === "team" ? f.id : data.players.find((p) => p.id === f.id)?.team_id,
    label: f.type === "team" ? data.teams.find((x) => x.id === f.id)?.name : data.players.find((p) => p.id === f.id)?.display_name })).filter((x) => x.label);
  const followIndex = (m: Match) => Math.max(0, followTeams.findIndex((f) => f.teamId && (f.teamId === m.home_team_id || f.teamId === m.away_team_id)));
  const labels: Labels = {
    colourOf: (m) => followIndex(m) % SWATCHES.length,
    followedLabel: (m) => followTeams[followIndex(m)]?.label ?? "",
    courtLabel: (m) => { const c = data.courts.find((x) => x.id === m.court_id); return c ? `${t.map.court} ${c.label}` : m.court_label_raw ?? t.schedule.courtUnknown; },
    opponent: (m) => { const followed = followTeams[followIndex(m)]?.teamId; const other = m.home_team_id === followed ? m.away_team_id : m.home_team_id; return data.teams.find((x) => x.id === other)?.name ?? t.court.tbd; },
  };
  const teamName = (id: string | null) => data.teams.find((x) => x.id === id)?.name ?? t.court.tbd;
  const addToCalendar = () => {
    const rows = days.flatMap((d) => d.matches.map((c) => ({ id: c.match.id, start_at: c.match.start_at, est_duration_min: c.match.est_duration_min,
      title: `${teamName(c.match.home_team_id)} ${t.schedule.vsShort} ${teamName(c.match.away_team_id)}`, court: labels.courtLabel(c.match) })));
    downloadIcs("ovachamps-my-schedule.ics", toIcs(rows, new Date(appNow()).toISOString()));
  };
  const selected = Math.min(day, Math.max(0, days.length - 1));
  const current = days[selected];
  return <div className="min-w-0 space-y-5">
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:justify-between">
      <div role="group" aria-label={t.schedule.view} className="inline-flex min-w-0 rounded-lg border bg-muted p-1">
        <Button variant={view === "agenda" ? "secondary" : "ghost"} size="sm" aria-pressed={view === "agenda"} onClick={() => setView("agenda")} className="tap gap-1 px-2"><List className="h-4 w-4" aria-hidden />{t.schedule.agenda}</Button>
        <Button variant={view === "day" ? "secondary" : "ghost"} size="sm" aria-pressed={view === "day"} onClick={() => setView("day")} className="tap gap-1 px-2"><CalendarDays className="h-4 w-4" aria-hidden />{t.schedule.calendar}</Button>
      </div>
      <Button variant="outline" size="icon" className="tap shrink-0" title={t.schedule.addToCalendar} aria-label={t.schedule.addToCalendar} onClick={addToCalendar} disabled={!days.length}><CalendarPlus className="h-5 w-5" aria-hidden /></Button>
    </div>
    {current && <div role="tablist" aria-label={t.schedule.calendar} className="flex gap-2 overflow-x-auto pb-1">{days.map((d, i) => {
      const first = d.matches[0];
      return first && <Button key={d.date} role="tab" aria-selected={i === selected} variant={i === selected ? "default" : "outline"} className="tap h-auto shrink-0 flex-col gap-0.5 px-4 py-2" onClick={() => setDay(i)}><span>{eventDateLabel(first.match.start_at)}</span><span className="text-xs font-normal">{d.matches.length} {t.schedule.matchCount}</span></Button>;
    })}</div>}
    {followTeams.length > 0 && <details className="border-y py-3"><summary className="cursor-pointer text-sm font-semibold">{t.schedule.key}</summary><ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">{followTeams.map((f, i) => <li key={`${f.follow.type}-${f.follow.id}`} className="flex min-w-0 items-center gap-2"><span className={`h-3 w-3 shrink-0 rounded-full ${SWATCHES[i % SWATCHES.length]}`} aria-hidden />{f.label}</li>)}</ul></details>}
    {!current ? <p className="py-5 text-muted-foreground">{t.schedule.noDays}</p> : view === "day" ? <DayView key={current.date} matches={current.matches} {...labels} /> : <ol aria-label={t.schedule.agenda} className="space-y-3">{current.matches.map((entry) => <li key={entry.match.id}><MatchBlock entry={entry} {...labels} /></li>)}</ol>}
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t py-4 text-sm"><span className="flex min-w-0 items-center gap-2"><BellRing className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />{t.schedule.reminders}</span><Badge variant="secondary">{t.schedule.comingSoon}</Badge></div>
  </div>;
}

function MatchBlock({ entry: c, colourOf, courtLabel, opponent, followedLabel }: { entry: CalendarMatch<Match> } & Labels) {
  return <article aria-label={`${courtLabel(c.match)}, ${eventTime(c.match.start_at)}, ${followedLabel(c.match)}`} className={`h-full min-w-0 space-y-2 rounded-lg border border-l-4 bg-card p-3 ${BORDERS[colourOf(c.match)]}`}>
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3"><time className="font-display text-2xl font-bold" dateTime={c.match.start_at}>{eventTime(c.match.start_at)}</time>{c.match.court_id ? <Link to="/courts/$courtId" params={{ courtId: c.match.court_id }} className="tap -my-1 inline-flex items-center text-sm font-semibold text-primary underline-offset-4 hover:underline">{courtLabel(c.match)}</Link> : <span className="text-sm text-muted-foreground">{courtLabel(c.match)}</span>}</div>
    <p className="text-sm font-semibold">{followedLabel(c.match)}</p>
    <p className="text-sm text-muted-foreground">{t.schedule.vsShort} {opponent(c.match)}</p>
    <p className="flex items-center gap-2 text-sm font-medium text-primary"><Clock className="h-4 w-4 shrink-0" aria-hidden />{t.schedule.leaveBy} <time dateTime={c.leaveBy}>{eventTime(c.leaveBy)}</time></p>
    {c.match.time_estimated && <p className="text-xs text-muted-foreground">{t.schedule.estimated}</p>}
    <div className="flex flex-wrap gap-1.5">
      {c.clashWith.length > 0 && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" aria-hidden />{t.schedule.clashShort}</Badge>}
      {c.priority && <Badge className="gap-1"><Flag className="h-3 w-3" aria-hidden />{t.schedule.goFirst}</Badge>}
      {c.tightWith.length > 0 && <Badge variant="outline" className="gap-1 border-accent text-accent">{t.schedule.tight}</Badge>}
    </div>
  </article>;
}

function DayView({ matches, ...labels }: { matches: CalendarMatch<Match>[] } & Labels) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(appNow()); const timer = setInterval(() => setNow(appNow()), 30_000); return () => clearInterval(timer); }, []);
  const first = matches[0];
  if (!first) return null;
  const startMin = Math.floor(Math.min(...matches.map((m) => torontoMinutes(m.match.start_at))) / 60) * 60;
  const endMin = Math.ceil(Math.max(...matches.map((m) => torontoMinutes(m.endsAt) || 24 * 60)) / 60) * 60;
  const span = Math.max(60, endMin - startMin);
  const hours = Array.from({ length: span / 60 + 1 }, (_, i) => startMin / 60 + i);
  const layout = calendarLanes(matches);
  const columns = Math.max(1, ...[...layout.values()].map((v) => v.of));
  const nowIso = now === null ? null : new Date(now).toISOString();
  const showNow = nowIso && eventDateLabel(nowIso) === eventDateLabel(first.match.start_at);
  const nowMin = nowIso ? torontoMinutes(nowIso) : -1;
  return <div role="region" aria-label={t.schedule.calendar} tabIndex={0} className="schedule-day max-h-[640px] overflow-auto rounded-lg border bg-background">
    <div className="relative flex" style={{ height: span * PX_PER_MIN + 200, minWidth: 60 + columns * 240 }}>
      <ol className="sticky left-0 z-20 w-14 shrink-0 border-r bg-background text-xs text-muted-foreground" aria-hidden>{hours.map((h) => <li key={h} className="absolute right-2 -translate-y-1/2" style={{ top: (h * 60 - startMin) * PX_PER_MIN + 16 }}>{hourLabel(h % 24)}</li>)}</ol>
      <ul className="relative min-w-0 flex-1" aria-label={t.schedule.timezone}>
        {hours.map((h) => <li key={h} aria-hidden className="absolute inset-x-0 border-t border-border" style={{ top: (h * 60 - startMin) * PX_PER_MIN + 16 }} />)}
        {showNow && nowMin >= startMin && nowMin <= endMin && <li aria-label={`${t.schedule.now} ${eventTime(nowIso)}`} className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-destructive" style={{ top: (nowMin - startMin) * PX_PER_MIN + 16 }} />}
        {matches.map((c) => {
          const top = (torontoMinutes(c.match.start_at) - startMin) * PX_PER_MIN + 16;
          const duration = (Date.parse(c.endsAt) - Date.parse(c.match.start_at)) / 60_000;
          const height = Math.max(190, duration * PX_PER_MIN - 8);
          const { lane, of } = layout.get(c.match.id) ?? { lane: 0, of: 1 };
          return <li key={c.match.id} className="absolute overflow-y-auto rounded-lg" style={{ top, height, left: `calc(${(lane / of) * 100}% + 6px)`, width: `calc(${100 / of}% - 12px)` }}><MatchBlock entry={c} {...labels} /></li>;
        })}
      </ul>
    </div>
  </div>;
}
