import type { Follow } from "@/lib/follows";

export type ScheduledMatch = {
  id: string; start_at: string; est_duration_min: number; court_id: string | null;
  court_label_raw?: string | null; home_team_id: string | null; away_team_id: string | null; status: string;
};

export function arrivalTime(start: string, warmup: number, walk: number) {
  return new Date(new Date(start).getTime() - (warmup + walk) * 60_000);
}

function courtKey(match: ScheduledMatch) {
  return match.court_id ?? match.court_label_raw?.trim().toLowerCase() ?? null;
}

export function clashes(a: ScheduledMatch, b: ScheduledMatch, warmup: number, walk: number) {
  if (a.id === b.id || !courtKey(a) || !courtKey(b) || courtKey(a) === courtKey(b)) return false;
  if ([a.status, b.status].some((status) => status === "final" || status === "cancelled")) return false;
  const [earlier, later] = new Date(a.start_at).getTime() <= new Date(b.start_at).getTime() ? [a, b] : [b, a];
  return arrivalTime(later.start_at, warmup, walk).getTime() < new Date(earlier.start_at).getTime() + earlier.est_duration_min * 60_000;
}

export function followedMatches<T extends ScheduledMatch>(matches: T[], players: { id: string; team_id: string }[], follows: Follow[]): T[] {
  const teamIds = new Set(follows.flatMap((follow) => follow.type === "team" ? [follow.id] : players.filter((p) => p.id === follow.id).map((p) => p.team_id)));
  return matches.filter((m) => (m.home_team_id != null && teamIds.has(m.home_team_id)) || (m.away_team_id != null && teamIds.has(m.away_team_id)))
    .filter((m, i, all) => all.findIndex((other) => other.id === m.id) === i)
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
}

export const eventTime = (date: string | Date) => new Date(date).toLocaleTimeString("en-CA", { timeZone: "America/Toronto", hour: "numeric", minute: "2-digit" });
export const eventDateKey = (date: string) => new Date(date).toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
export const eventDateLabel = (date: string) => new Date(date).toLocaleDateString("en-CA", { timeZone: "America/Toronto", weekday: "long", month: "short", day: "numeric" });