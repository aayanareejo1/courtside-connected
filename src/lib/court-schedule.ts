export type CourtMatch = { id: string; start_at: string; status: string; est_duration_min: number };

// A live status is authoritative even when an estimated finish has passed.
export function courtSchedule<T extends CourtMatch>(matches: readonly T[], now: number) {
  const sorted = [...matches].filter(m => Number.isFinite(Date.parse(m.start_at)))
    .sort((a, b) => Date.parse(a.start_at) - Date.parse(b.start_at) || a.id.localeCompare(b.id));
  const eligible = sorted.filter(m => m.status !== 'final' && m.status !== 'cancelled');
  const current = eligible.find(m => m.status === 'live' && Date.parse(m.start_at) <= now)
    ?? eligible.find(m => Date.parse(m.start_at) <= now && Date.parse(m.start_at) + m.est_duration_min * 60_000 > now);
  const future = eligible.filter(m => m !== current && Date.parse(m.start_at) > now);
  const featured = current ?? future[0];
  return { current, featured, nextThree: future.filter(m => m !== featured).slice(0, 3),
    finals: sorted.filter(m => m.status === 'final').reverse() };
}

export function hasMapPosition(court: { map_x: number | null; map_y: number | null }) {
  return typeof court.map_x === 'number' && typeof court.map_y === 'number'
    && Number.isFinite(court.map_x) && Number.isFinite(court.map_y)
    && court.map_x >= 0 && court.map_x <= 100 && court.map_y >= 0 && court.map_y <= 100;
}

export function courtsByNumber<T extends { label: string }>(courts: readonly T[], input = ''): T[] {
  const query = input.trim().replace(/^court\s*/i, '').replace(/^0+(?=\d)/, '');
  return courts.filter(c => !query || c.label.toLowerCase().startsWith(query.toLowerCase()))
    .sort((a, b) => a.label.localeCompare(b.label, 'en', { numeric: true }));
}
