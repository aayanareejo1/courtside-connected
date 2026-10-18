// Day view calendar for "My schedule". All times, clashes and leave by values come from buildCalendar; this file only lays them out.
import { useState } from "react";
import { AlertTriangle, BellRing, CalendarPlus, Clock, Flag } from "lucide-react";
import { buildCalendar, toIcs, downloadIcs, type CalendarMatch } from "@/lib/calendar";
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
const PX_PER_MIN = 1.6;

// Minutes since Toronto midnight, for placing a block on the axis (display only).
function torontoMinutes(iso: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}
const hourLabel = (h: number) => `${((h + 11) % 12) + 1} ${h < 12 ? "a.m." : "p.m."}`;

// Group blocks that clash with each other so they sit side by side.
function lanes(matches: CalendarMatch<Match>[]) {
  const out = new Map<string, { lane: number; of: number }>();
  const seen = new Set<string>();
  for (const m of matches) {
    if (seen.has(m.match.id)) continue;
    const group: string[] = [];
    const stack = [m.match.id];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id); group.push(id);
      stack.push(...(matches.find((x) => x.match.id === id)?.clashWith ?? []).filter((x) => matches.some((y) => y.match.id === x)));
    }
    const ordered = matches.filter((x) => group.includes(x.match.id)).map((x) => x.match.id);
    ordered.forEach((id, i) => out.set(id, { lane: i, of: ordered.length }));
  }
  return out;
}

export function ScheduleCalendar({ data, matches, follows }: { data: EventData; matches: Match[]; follows: Follow[] }) {
  const days = buildCalendar(matches);
  const [day, setDay] = useState(0);
  const followTeams = follows.map((f) => ({ follow: f, teamId: f.type === "team" ? f.id : data.players.find((p) => p.id === f.id)?.team_id,
    label: f.type === "team" ? data.teams.find((x) => x.id === f.id)?.name : data.players.find((p) => p.id === f.id)?.display_name }))
    .filter((x) => x.label);
  const colourOf = (m: Match) => Math.max(0, followTeams.findIndex((f) => f.teamId && (f.teamId === m.home_team_id || f.teamId === m.away_team_id))) % SWATCHES.length;
  const courtLabel = (m: Match) => { const c = data.courts.find((x) => x.id === m.court_id); return c ? `${t.map.court} ${c.label}` : m.court_label_raw ?? t.schedule.courtUnknown; };
  const opponent = (m: Match) => {
    const followed = followTeams[colourOf(m)]?.teamId;
    const other = m.home_team_id === followed ? m.away_team_id : m.home_team_id;
    return data.teams.find((x) => x.id === other)?.name ?? t.court.tbd;
  };
  const teamName = (id: string | null) => data.teams.find((x) => x.id === id)?.name ?? t.court.tbd;

  const addToCalendar = () => {
    const rows = days.flatMap((d) => d.matches.map((c) => ({ id: c.match.id, start_at: c.match.start_at, est_duration_min: c.match.est_duration_min,
      title: `${teamName(c.match.home_team_id)} ${t.schedule.vsShort} ${teamName(c.match.away_team_id)}`, court: courtLabel(c.match) })));
    downloadIcs("courtside-my-schedule.ics", toIcs(rows, new Date(appNow()).toISOString()));
  };

  const current = days[Math.min(day, days.length - 1)];
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-2">
      <Button className="tap" onClick={addToCalendar} disabled={!days.length}><CalendarPlus className="h-4 w-4" aria-hidden />{t.schedule.addToCalendar}</Button>
    </div>
    <div className="flex items-center justify-between rounded-lg border bg-card p-3 text-sm">
      <span className="flex items-center gap-2 font-semibold"><BellRing className="h-4 w-4" aria-hidden />{t.schedule.reminders}</span>
      <Badge variant="secondary">{t.schedule.comingSoon}</Badge>
    </div>
    {followTeams.length > 0 && <section aria-label={t.schedule.key}><p className="mb-1 text-xs uppercase text-muted-foreground">{t.schedule.key}</p>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">{followTeams.map((f, i) => <li key={`${f.follow.type}-${f.follow.id}`} className="flex items-center gap-2"><span className={`h-3 w-3 rounded-full ${SWATCHES[i % SWATCHES.length]}`} aria-hidden />{f.label}</li>)}</ul></section>}
    {!current ? <p className="py-5 text-muted-foreground">{t.schedule.noDays}</p> : <>
      {days.length > 1 && <div role="tablist" aria-label={t.schedule.calendar} className="flex gap-2 overflow-x-auto">{days.map((d, i) =>
        <Button key={d.date} role="tab" aria-selected={i === day} variant={i === day ? "default" : "outline"} size="sm" className="tap shrink-0" onClick={() => setDay(i)}>{eventDateLabel(d.matches[0]!.match.start_at)}</Button>)}</div>}
      <DayView key={current.date} matches={current.matches} colourOf={colourOf} courtLabel={courtLabel} opponent={opponent} />
    </>}
  </div>;
}

function DayView({ matches, colourOf, courtLabel, opponent }: { matches: CalendarMatch<Match>[]; colourOf: (m: Match) => number; courtLabel: (m: Match) => string; opponent: (m: Match) => string }) {
  const startMin = Math.floor(Math.min(...matches.map((m) => torontoMinutes(m.leaveBy))) / 60) * 60;
  const endMin = Math.ceil(Math.max(...matches.map((m) => torontoMinutes(m.endsAt) || 24 * 60)) / 60) * 60;
  const span = Math.max(60, endMin - startMin);
  const hours = Array.from({ length: span / 60 + 1 }, (_, i) => startMin / 60 + i);
  const layout = lanes(matches);
  const now = appNow();
  const nowIso = new Date(now).toISOString();
  const showNow = eventDateLabel(nowIso) === eventDateLabel(matches[0]!.match.start_at);
  const nowMin = torontoMinutes(nowIso);
  return <div className="relative flex rounded-lg border bg-card" style={{ height: span * PX_PER_MIN + 16 }}>
    <ol className="relative w-16 shrink-0 border-r text-xs text-muted-foreground" aria-hidden>{hours.map((h) =>
      <li key={h} className="absolute right-2 -translate-y-1/2" style={{ top: (h * 60 - startMin) * PX_PER_MIN + 8 }}>{hourLabel(h % 24)}</li>)}</ol>
    <ul className="relative flex-1" aria-label={t.schedule.timezone}>
      {hours.map((h) => <li key={h} aria-hidden className="absolute inset-x-0 border-t border-border" style={{ top: (h * 60 - startMin) * PX_PER_MIN + 8 }} />)}
      {showNow && nowMin >= startMin && nowMin <= endMin && <li aria-label={`${t.schedule.now} ${eventTime(nowIso)}`} className="absolute inset-x-0 z-10 border-t-2 border-destructive" style={{ top: (nowMin - startMin) * PX_PER_MIN + 8 }} />}
      {matches.map((c) => {
        const top = (torontoMinutes(c.match.start_at) - startMin) * PX_PER_MIN + 8;
        const height = Math.max(64, c.match.est_duration_min * PX_PER_MIN);
        const { lane, of } = layout.get(c.match.id) ?? { lane: 0, of: 1 };
        const i = colourOf(c.match);
        return <li key={c.match.id} className={`absolute overflow-hidden rounded-md border-l-4 bg-background p-2 text-sm shadow-sm ${BORDERS[i]}`}
          style={{ top, height, left: `calc(${(lane / of) * 100}% + 4px)`, width: `calc(${100 / of}% - 8px)` }}>
          <p className="font-semibold">{courtLabel(c.match)} · {eventTime(c.match.start_at)}</p>
          <p className="truncate">{t.schedule.vsShort} {opponent(c.match)}</p>
          <p className="flex items-center gap-1 text-primary"><Clock className="h-3 w-3" aria-hidden />{t.schedule.leaveBy} {eventTime(c.leaveBy)}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {c.clashWith.length > 0 && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" aria-hidden />{t.schedule.clashShort}</Badge>}
            {c.priority && <Badge className="gap-1"><Flag className="h-3 w-3" aria-hidden />{t.schedule.goFirst}</Badge>}
            {c.tightWith.length > 0 && <Badge variant="outline" className="gap-1 border-accent text-accent">{t.schedule.tight}</Badge>}
          </div>
        </li>;
      })}
    </ul>
  </div>;
}
