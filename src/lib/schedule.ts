import type { Follow } from "@/lib/follows";

export type ScheduledMatch = {
  id: string; start_at: string; est_duration_min: number; court_id: string | null;
  court_label_raw?: string | null; home_team_id: string | null; away_team_id: string | null; status: string;
};

export function arrivalTime(start: string, warmup: number, walk: number) {
  return new Date(new Date(start).getTime() - (warmup + walk) * 60_000);
}

export const FAN_WARMUP_MINUTES = 10;
export const FAN_WALK_MINUTES = 5;
export const recommendedArrivalTime = (start: string) => arrivalTime(start, FAN_WARMUP_MINUTES, FAN_WALK_MINUTES);

export function upcomingMatches<T extends ScheduledMatch>(matches: readonly T[], now: number): T[] {
  return matches.filter((m) => m.status !== "final" && m.status !== "cancelled" &&
    (Date.parse(m.start_at) >= now || (m.status === "live" && Date.parse(m.start_at) + m.est_duration_min * 60_000 > now)))
    .sort((a, b) => Date.parse(a.start_at) - Date.parse(b.start_at));
}

export function tightTurnaround(a: ScheduledMatch, b: ScheduledMatch): boolean {
  if (a.id === b.id || [a.status, b.status].some((s) => s === "final" || s === "cancelled")) return false;
  return Math.abs(Date.parse(a.start_at) - Date.parse(b.start_at)) <= 30 * 60_000;
}

export function teamsWithoutUpcoming<T extends { id: string }>(teams: readonly T[], upcoming: readonly ScheduledMatch[]): T[] {
  return teams.filter((team) => !upcoming.some((m) => m.home_team_id === team.id || m.away_team_id === team.id));
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
