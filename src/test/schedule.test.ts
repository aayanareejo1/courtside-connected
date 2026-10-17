import { describe, expect, it } from "vitest";
import { arrivalTime, clashes, followedMatches, eventTime, type ScheduledMatch } from "@/lib/schedule";

const match = (overrides: Partial<ScheduledMatch> = {}): ScheduledMatch => ({ id: "one", start_at: "2026-11-07T13:30:00Z", est_duration_min: 60, court_id: "31", home_team_id: "skyline", away_team_id: "london", status: "scheduled", ...overrides });

describe("Arrival times", () => {
  it("subtracts 45 minutes warm-up and 5 minutes walking", () => {
    expect(arrivalTime("2026-11-07T13:30:00Z", 45, 5).toISOString()).toBe("2026-11-07T12:40:00.000Z");
  });
  it("uses staff-editable event timings", () => {
    expect(arrivalTime("2026-11-07T13:30:00Z", 30, 10).toISOString()).toBe("2026-11-07T12:50:00.000Z");
  });
  it("handles arrival crossing midnight", () => {
    expect(arrivalTime("2026-11-07T00:30:00Z", 45, 5).toISOString()).toBe("2026-11-06T23:40:00.000Z");
  });
  it("displays time in Toronto, including standard time", () => {
    expect(eventTime("2026-11-07T13:30:00Z")).toBe("8:30 a.m.");
  });
});

describe("Clashes", () => {
  it("flags separate simultaneous courts symmetrically", () => {
    const a = match(); const b = match({ id: "two", court_id: "34" });
    expect(clashes(a, b, 45, 5)).toBe(true);
    expect(clashes(b, a, 45, 5)).toBe(true);
  });
  it("flags arrival before the earlier estimated end", () => {
    expect(clashes(match(), match({ id: "two", court_id: "34", start_at: "2026-11-07T15:00:00Z" }), 45, 5)).toBe(true);
  });
  it("does not flag arrival exactly at or after the estimated end", () => {
    expect(clashes(match(), match({ id: "two", court_id: "34", start_at: "2026-11-07T15:20:00Z" }), 45, 5)).toBe(false);
    expect(clashes(match(), match({ id: "two", court_id: "34", start_at: "2026-11-07T16:00:00Z" }), 45, 5)).toBe(false);
  });
  it("does not flag the same match or same court", () => {
    expect(clashes(match(), match(), 45, 5)).toBe(false);
    expect(clashes(match(), match({ id: "two" }), 45, 5)).toBe(false);
  });
  it("excludes final and cancelled matches", () => {
    for (const status of ["final", "cancelled"]) expect(clashes(match(), match({ id: "two", court_id: "34", status }), 45, 5)).toBe(false);
  });
  it("does not guess unknown courts", () => {
    expect(clashes(match(), match({ id: "two", court_id: null }), 45, 5)).toBe(false);
  });
});

describe("Combined follows", () => {
  it("resolves a player to their team and includes away matches", () => {
    expect(followedMatches([match()], [{ id: "child", team_id: "london" }], [{ type: "player", id: "child" }]).map((m) => m.id)).toEqual(["one"]);
  });
  it("deduplicates team, child and opponent follows into one shared match", () => {
    expect(followedMatches([match(), match()], [{ id: "child", team_id: "skyline" }], [{ type: "team", id: "skyline" }, { type: "team", id: "london" }, { type: "player", id: "child" }])).toHaveLength(1);
  });
  it("sorts across days and ignores stale follows", () => {
    const later = match({ id: "later", start_at: "2026-11-08T13:30:00Z" });
    expect(followedMatches([later, match()], [], [{ type: "team", id: "skyline" }, { type: "player", id: "missing" }]).map((m) => m.id)).toEqual(["one", "later"]);
    expect(followedMatches([match()], [], [{ type: "player", id: "missing" }])).toEqual([]);
  });
});