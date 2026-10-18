// Pure helpers behind the "My schedule" calendar: day groups with leave by times, clash flags, and an .ics export.
// The screen only renders what these return. Everything is in Toronto time and runs on the device.
import { eventDateKey, recommendedArrivalTime, clashes, tightTurnaround, FAN_WARMUP_MINUTES, FAN_WALK_MINUTES, type ScheduledMatch } from "@/lib/schedule";

export type CalendarMatch<T extends ScheduledMatch = ScheduledMatch> = {
  match: T;
  leaveBy: string; // ISO, start minus warm up and walk
  endsAt: string; // ISO, start plus estimated duration
  clashWith: string[]; // other followed matches that cannot both be reached in time
  tightWith: string[]; // other followed matches starting within 30 minutes
  priority: boolean; // true when this is the earlier match of a clash (go here first)
};
export type CalendarDay<T extends ScheduledMatch = ScheduledMatch> = { date: string; matches: CalendarMatch<T>[] };

export function buildCalendar<T extends ScheduledMatch>(matches: readonly T[]): CalendarDay<T>[] {
  const live = matches.filter((m) => m.status !== "cancelled");
  const days = new Map<string, CalendarMatch<T>[]>();
  for (const m of [...live].sort((a, b) => Date.parse(a.start_at) - Date.parse(b.start_at))) {
    const others = live.filter((o) => o.id !== m.id);
    const clashWith = others.filter((o) => clashes(m, o, FAN_WARMUP_MINUTES, FAN_WALK_MINUTES)).map((o) => o.id);
    const tightWith = others.filter((o) => tightTurnaround(m, o)).map((o) => o.id);
    const earlier = (o: T) => Date.parse(o.start_at) > Date.parse(m.start_at) || (o.start_at === m.start_at && o.id > m.id);
    const entry: CalendarMatch<T> = {
      match: m,
      leaveBy: recommendedArrivalTime(m.start_at).toISOString(),
      endsAt: new Date(Date.parse(m.start_at) + m.est_duration_min * 60_000).toISOString(),
      clashWith,
      tightWith,
      priority: clashWith.length > 0 && others.filter((o) => clashWith.includes(o.id)).every(earlier),
    };
    const key = eventDateKey(m.start_at);
    days.set(key, [...(days.get(key) ?? []), entry]);
  }
  return [...days.entries()].map(([date, list]) => ({ date, matches: list }));
}

// ---- .ics export (RFC 5545). Times are written in UTC so every calendar app shows them correctly. ----
const icsStamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) { out.push(rest.slice(0, 74)); rest = " " + rest.slice(74); }
  return [...out, rest].join("\r\n");
}

export type IcsMatch = { id: string; start_at: string; est_duration_min: number; title: string; court: string; calendarName?: string };

export function toIcs(matches: readonly IcsMatch[], nowIso: string): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//OVAchamps//My schedule//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:OVAchamps"];
  for (const m of matches) {
    const end = new Date(Date.parse(m.start_at) + m.est_duration_min * 60_000).toISOString();
    const leave = recommendedArrivalTime(m.start_at).toISOString();
    lines.push(
      "BEGIN:VEVENT",
      `UID:${icsText(m.id)}@courtside-connected`,
      `DTSTAMP:${icsStamp(nowIso)}`,
      `DTSTART:${icsStamp(m.start_at)}`,
      `DTEND:${icsStamp(end)}`,
      `SUMMARY:${icsText(m.title)}`,
      `LOCATION:${icsText(m.court)}`,
      `DESCRIPTION:${icsText(`Be at the court by ${new Date(leave).toLocaleTimeString("en-CA", { timeZone: "America/Toronto", hour: "numeric", minute: "2-digit" })} (10 minute warm up and 5 minute walk).`)}`,
      "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Time to head to the court", `TRIGGER;VALUE=DATE-TIME:${icsStamp(leave)}`, "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

// Browser only: hands the file to the user. Nothing is sent to a server.
export function downloadIcs(filename: string, ics: string) {
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
