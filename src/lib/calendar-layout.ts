import type { CalendarMatch } from "@/lib/calendar";

// Colour the conflict graph returned by buildCalendar, reusing columns rather
// than giving every event in a connected chain its own permanent column.
// This is presentation only: no match times or conflict rules are calculated.
export function calendarLanes(matches: readonly CalendarMatch[]) {
  const ids = new Set(matches.map((entry) => entry.match.id));
  const neighbours = new Map(matches.map((entry) => [entry.match.id, new Set(entry.clashWith.filter((id) => ids.has(id)))]));
  for (const [id, peers] of neighbours) for (const peer of peers) neighbours.get(peer)?.add(id);
  const columns = new Map<string, number>();
  for (const entry of matches) {
    const occupied = new Set([...neighbours.get(entry.match.id) ?? []].map((id) => columns.get(id)));
    let column = 0;
    while (occupied.has(column)) column++;
    columns.set(entry.match.id, column);
  }
  const sizes = new Map<string, number>();
  for (const entry of matches) {
    if (sizes.has(entry.match.id)) continue;
    const group = new Set<string>();
    const pending = [entry.match.id];
    while (pending.length) {
      const id = pending.pop();
      if (!id || group.has(id)) continue;
      group.add(id);
      pending.push(...neighbours.get(id) ?? []);
    }
    const size = Math.max(...[...group].map((id) => columns.get(id) ?? 0)) + 1;
    for (const id of group) sizes.set(id, size);
  }
  return new Map(matches.map((entry) => [entry.match.id, { lane: columns.get(entry.match.id) ?? 0, of: sizes.get(entry.match.id) ?? 1 }]));
}
