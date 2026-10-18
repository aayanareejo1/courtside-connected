import { sourceHealth, asProvenance, type MatchSource } from '@/lib/source-status';
import { followedMatches, upcomingMatches, type ScheduledMatch } from '@/lib/schedule';
import type { Follow } from '@/lib/follows';

// A source's sample or archived status must never create a claim of current play.
export function homeSummary<T extends ScheduledMatch & { source_id?: string | null }>(
  matches: T[], players: { id: string; team_id: string }[], follows: Follow[],
  sources: MatchSource[], now: number, savedAt: number | null,
) {
  const current = matches.filter(m => {
    const source = sources.find(s => s.id === m.source_id);
    return savedAt === null && source && asProvenance(source.last_provenance) === 'live' &&
      sourceHealth(source, now) === 'ok' && m.status === 'live' &&
      Date.parse(m.start_at) <= now && Date.parse(m.start_at) + m.est_duration_min * 60_000 > now;
  }).sort((a,b) => Date.parse(a.start_at) - Date.parse(b.start_at));
  const personal = followedMatches(matches, players, follows);
  const candidates = follows.length ? personal : matches;
  const next = upcomingMatches(candidates, now).find(m => Date.parse(m.start_at) >= now && !current.some(c => c.id === m.id)) ?? null;
  return { current: current[0] ?? null, currentCount: current.length, next, personal: follows.length > 0 };
}
