import { describe, expect, it } from "vitest";
import { DEMO_START, demoClock, nextDemoState } from "@/lib/clock";
import { buildCalendar, toIcs } from "@/lib/calendar";
import { buildFacts, fallbackAnswer, parseAskRequest } from "@/lib/ask-courtside";
import { mapTimu } from "@/lib/source-mapping";
import { timuDay1 } from "@/server/fixtures/timu-day1";

const m = (id: string, start: string, court: string, home: string, away: string, status = "scheduled") =>
  ({ id, start_at: start, est_duration_min: 60, court_id: court, home_team_id: home, away_team_id: away, status, source_id: "s", court_label_raw: null, results: null });

describe("demo clock", () => {
  it("starts at 12:30 PM Toronto on day one and runs forward", () => {
    expect(new Date(DEMO_START).toISOString()).toBe("2026-04-19T16:30:00.000Z");
    expect(demoClock(1000, 1000 + 60_000)).toBe(DEMO_START + 60_000);
  });
  it("turns on and off from the address and remembers the choice", () => {
    expect(nextDemoState("?demo=1", null, 500)).toBe(500);
    expect(nextDemoState("?demo=1", 100, 500)).toBe(100);
    expect(nextDemoState("", 100, 500)).toBe(100);
    expect(nextDemoState("?demo=0", 100, 500)).toBeNull();
    expect(nextDemoState("", null, 500)).toBeNull();
  });
});

describe("calendar", () => {
  const a = m("a", "2026-04-19T17:00:00Z", "5", "T1", "X");
  const b = m("b", "2026-04-19T18:00:00Z", "9", "T1", "Y"); // starts when a ends, different court: clash
  const c = m("c", "2026-04-19T18:20:00Z", "9", "T1", "Z"); // within 30 minutes of b, same court: tight only
  const far = m("far", "2026-04-20T15:00:00Z", "5", "T1", "W");
  it("groups by Toronto day and gives leave by times", () => {
    const days = buildCalendar([far, b, a]);
    expect(days.map((d) => d.date)).toEqual(["2026-04-19", "2026-04-20"]);
    expect(days[0]!.matches[0]!.leaveBy).toBe("2026-04-19T16:45:00.000Z");
  });
  it("flags clashes and sends the fan to the earlier match first", () => {
    const [x, y] = buildCalendar([a, b])[0]!.matches;
    expect(x!.clashWith).toEqual(["b"]);
    expect(x!.priority).toBe(true);
    expect(y!.priority).toBe(false);
  });
  it("flags tight turnarounds and ignores cancelled matches", () => {
    const rows = buildCalendar([b, c, { ...far, status: "cancelled" }]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.matches[0]!.tightWith).toEqual(["c"]);
  });
  it("writes a valid .ics with a reminder and escaped text", () => {
    const ics = toIcs([{ id: "a", start_at: a.start_at, est_duration_min: 60, title: "Storm, 13U vs Tide", court: "Court 5" }], "2026-04-19T16:00:00Z");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("DTSTART:20260419T170000Z");
    expect(ics).toContain("SUMMARY:Storm\\, 13U vs Tide");
    expect(ics).toContain("TRIGGER;VALUE=DATE-TIME:20260419T164500Z");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
});

describe("Ask Courtside", () => {
  it("validates requests", () => {
    expect(parseAskRequest({ question: "" })).toBeNull();
    expect(parseAskRequest({ question: "x".repeat(301) })).toBeNull();
    expect(parseAskRequest({ question: " Where? ", follows: [{ type: "team", id: "t" }, { type: "bad", id: "z" }], now: 5 })).toEqual({ question: "Where?", follows: [{ type: "team", id: "t" }], now: 5 });
  });
  const data = {
    teams: [{ id: "T1", name: "Skyline" }, { id: "X", name: "Peaks" }],
    players: [], courts: [{ id: "5", label: "5", areas: { name: "Hall 1" } }],
    sources: [{ id: "s", last_provenance: "sample" }], matches: [m("a", "2026-04-19T17:00:00Z", "5", "T1", "X")],
  };
  it("builds facts from canonical data with the source label and leave by time", () => {
    const f = buildFacts(data, [{ type: "team", id: "T1" }], Date.parse("2026-04-19T16:30:00Z"));
    expect(f.lines[0]).toContain("Skyline vs Peaks");
    expect(f.lines[0]).toContain("Court 5 (Hall 1)");
    expect(f.lines[0]).toContain("Sample data, not live");
    expect(f.lines[0]).toMatch(/leave by 12:45/);
  });
  it("falls back to a plain answer without a model", () => {
    expect(fallbackAnswer(buildFacts(data, [], Date.parse("2026-04-19T16:30:00Z")))).toContain("Skyline");
    expect(fallbackAnswer(buildFacts({ ...data, matches: [] }, [], 0))).toContain("do not have");
  });
});

describe("sample day one matches the demo clock", () => {
  const games = mapTimu(timuDay1);
  it("has finished, live and upcoming matches, with a clash and a tight turnaround", () => {
    expect(new Set(games.map((g) => g.status))).toEqual(new Set(["final", "live", "scheduled"]));
    const cal = buildCalendar(games.filter((g) => g.home === "Ottawa Peaks 15U Red" || g.away === "Ottawa Peaks 15U Red").map((g, i) => ({ id: String(i), start_at: g.start_at, est_duration_min: 60, court_id: g.court_label, home_team_id: g.home, away_team_id: g.away, status: g.status })));
    expect(cal.flatMap((d) => d.matches).some((x) => x.tightWith.length && x.clashWith.length)).toBe(true);
  });
});
