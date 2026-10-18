import { describe, expect, it } from "vitest";
import { mapTimu, parseRosterCsv, privateName, type TimuGame } from "@/lib/source-mapping";
import { timuDay1 } from "@/server/fixtures/timu-day1";
import { speerRosterCsv } from "@/server/fixtures/speer-roster";

const game = (over: Partial<TimuGame> = {}): TimuGame => ({ match_no: "X1", division: "15U Girls", pool: "Pool B", date: "2026-04-19", time: "10:00", court: "Court 5", home: "A", away: "B", status: "Final", sets: [[25, 18], [20, 25], [15, 10]], ...over });

describe("privacy", () => {
  it("reduces full names to first name + last initial", () => {
    expect(privateName("Olivia", "Martinez")).toBe("Olivia M.");
  });
});

describe("TIMU mapping", () => {
  it("maps Toronto venue time, court number, pool and set counts", () => {
    const [m] = mapTimu({ games: [game()] });
    expect(m!.start_at).toBe("2026-04-19T14:00:00.000Z");
    expect(m!.court_label).toBe("5");
    expect(m!.pool).toBe("Pool B");
    expect(m!.result).toEqual({ home_sets: 2, away_sets: 1, set_scores: [[25, 18], [20, 25], [15, 10]] });
  });
  it("keeps an unknown court as its raw label", () => {
    expect(mapTimu({ games: [game({ court: "Court 99" })] })[0]!.court_label).toBe("99");
  });
  it("rejects the whole batch when one game is malformed", () => {
    expect(() => mapTimu({ games: [game(), game({ status: "???" })] })).toThrow();
  });
  it("maps the Day 1 fixture into 12 pool matches", () => {
    expect(mapTimu(timuDay1)).toHaveLength(12);
  });
});

describe("Speer roster CSV", () => {
  it("never stores full last names and keeps two coaches", () => {
    const [team] = parseRosterCsv(speerRosterCsv);
    expect(team!.players).toHaveLength(11);
    expect(team!.players[0]).toEqual({ display_name: "Ava B.", jersey_number: 2 });
    expect(team!.staff.map((s) => s.role)).toEqual(["Head Coach", "Assistant Coach"]);
    expect(JSON.stringify(team)).not.toContain("Brennan");
  });
  it("rejects a row with a bad jersey number", () => {
    const bad = speerRosterCsv.replace("2,Ava", "abc,Ava");
    expect(() => parseRosterCsv(bad)).toThrow(/jersey/);
  });
  it("rejects a CSV missing a required column", () => {
    expect(() => parseRosterCsv("first_name,last_name\nA,B")).toThrow(/missing column/);
  });
});
