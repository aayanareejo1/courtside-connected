import { describe, expect, it } from "vitest";
import { followedMatches, recommendedArrivalTime, eventTime, eventDateKey, upcomingMatches, tightTurnaround, teamsWithoutUpcoming, type ScheduledMatch } from "@/lib/schedule";

const now = Date.parse("2026-10-18T12:00:00Z");
const match = (patch: Partial<ScheduledMatch> = {}): ScheduledMatch => ({ id: "a", start_at: "2026-10-18T14:00:00Z", est_duration_min: 60, court_id: "5", home_team_id: "team", away_team_id: "opponent", status: "scheduled", ...patch });

describe("Fan schedules", () => {
  it("subtracts exactly ten warm-up and five walk minutes", () => {
    expect(recommendedArrivalTime("2026-10-18T14:00:00Z").toISOString()).toBe("2026-10-18T13:45:00.000Z");
  });
  it("uses Toronto daylight time for start and arrival", () => {
    expect(eventTime("2026-10-18T14:00:00Z")).toBe("10:00 a.m.");
    expect(eventTime(recommendedArrivalTime("2026-10-18T14:00:00Z"))).toBe("9:45 a.m.");
  });
  it("uses Toronto standard time after the clock change", () => {
    expect(eventTime("2026-11-07T14:00:00Z")).toBe("9:00 a.m.");
    expect(eventTime(recommendedArrivalTime("2026-11-07T14:00:00Z"))).toBe("8:45 a.m.");
  });
  it("handles arrival crossing Toronto midnight", () => {
    const arrival = recommendedArrivalTime("2026-10-18T04:05:00Z");
    expect(arrival.toISOString()).toBe("2026-10-18T03:50:00.000Z");
    expect(eventDateKey(arrival.toISOString())).toBe("2026-10-17");
  });
  it("follows a player on the away team and retains the court", () => {
    const rows = followedMatches([match()], [{ id: "player", team_id: "opponent" }], [{ type: "player", id: "player" }]);
    expect(rows.map((row) => [row.id, row.court_id])).toEqual([["a", "5"]]);
  });
  it("deduplicates overlapping player and team follows", () => {
    expect(followedMatches([match(), match()], [{ id: "player", team_id: "team" }], [{ type: "player", id: "player" }, { type: "team", id: "team" }])).toHaveLength(1);
  });
  it("sorts future starts without mutating input", () => {
    const rows = [match({ id: "later", start_at: "2026-10-19T14:00:00Z" }), match()];
    expect(upcomingMatches(rows, now).map((row) => row.id)).toEqual(["a", "later"]);
    expect(rows.map((row) => row.id)).toEqual(["later", "a"]);
  });
  it("excludes finished, cancelled and past scheduled matches", () => {
    expect(upcomingMatches([match({ status: "final" }), match({ id: "cancelled", status: "cancelled" }), match({ id: "past", start_at: "2026-10-18T10:00:00Z" }), match()], now).map((row) => row.id)).toEqual(["a"]);
  });
  it("includes a currently active live match but not an expired one", () => {
    expect(upcomingMatches([match({ id: "active", status: "live", start_at: "2026-10-18T11:30:00Z" }), match({ id: "expired", status: "live", start_at: "2026-10-18T10:00:00Z" })], now).map((row) => row.id)).toEqual(["active"]);
  });
  it("identifies empty followed teams even when another team has matches", () => {
    expect(teamsWithoutUpcoming([{ id: "team" }, { id: "empty" }, { id: "opponent" }], [match()])).toEqual([{ id: "empty" }]);
  });
  it("a team with only a finished match has no upcoming matches and retains its result", () => {
    const rows = followedMatches([{ ...match(), status: "final", results: { home_sets: 2, away_sets: 1 } }], [], [{ type: "team", id: "team" }]);
    expect(upcomingMatches(rows, now)).toEqual([]);
    expect(rows.filter((row) => row.status === "final")[0]?.results).toEqual({ home_sets: 2, away_sets: 1 });
  });
});

describe("Thirty-minute tight turnaround", () => {
  it("flags exactly thirty minutes, including the same court", () => {
    expect(tightTurnaround(match(), match({ id: "b", start_at: "2026-10-18T14:30:00Z" }))).toBe(true);
  });
  it("flags simultaneous starts on separate courts symmetrically", () => {
    const a = match(); const b = match({ id: "b", court_id: "9" });
    expect(tightTurnaround(a, b)).toBe(true);
    expect(tightTurnaround(b, a)).toBe(true);
  });
  it("does not flag thirty minutes and one second", () => {
    expect(tightTurnaround(match(), match({ id: "b", start_at: "2026-10-18T14:30:01Z" }))).toBe(false);
  });
  it("ignores the same match, finals and cancellations", () => {
    expect(tightTurnaround(match(), match())).toBe(false);
    for (const status of ["final", "cancelled"]) expect(tightTurnaround(match(), match({ id: "b", status }))).toBe(false);
  });
});
