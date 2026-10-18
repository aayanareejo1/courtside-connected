import { describe, expect, it } from "vitest";
import { calendarLanes } from "@/lib/calendar-layout";
import { buildCalendar } from "@/lib/calendar";
const match = (id: string, start_at: string) => ({ id, start_at, est_duration_min: 60, court_id: id, home_team_id: null, away_team_id: null, status: "scheduled" });
describe("calendar presentation", () => {
  it("reuses columns for a long conflict chain rather than allocating one per match", () => {
    const rows = Array.from({ length: 8 }, (_, i) => match(String(i), `2026-04-19T${String(17 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}:00Z`));
    const entries = buildCalendar(rows).flatMap((d) => d.matches);
    const layout = calendarLanes(entries);
    expect(Math.max(...[...layout.values()].map((v) => v.of))).toBe(3);
    for (const entry of entries) for (const peer of entry.clashWith) expect(layout.get(entry.match.id)?.lane).not.toBe(layout.get(peer)?.lane);
  });
  it("uses the full width for a non-clashing match", () => {
    const entries = buildCalendar([match("a", "2026-04-19T17:00:00Z"), match("b", "2026-04-19T20:00:00Z")]).flatMap((d) => d.matches);
    expect([...calendarLanes(entries).values()]).toEqual([{ lane: 0, of: 1 }, { lane: 0, of: 1 }]);
  });
});
