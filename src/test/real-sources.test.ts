import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adapters } from "@/server/adapters";
import { mapAesSchedule, mapMyteam, pairInitials, type AesCourtDay, type MyteamSchedule } from "@/lib/source-mapping";
import { realDataProvenance } from "@/lib/source-status";

// Synthetic data only: fictional names, never real participants.
const myteam: MyteamSchedule = {
  success: true,
  event: {
    timeFrames: [{ start: "2026-04-21T13:00:00.000Z" }],
    groups: [{ name: "15U Girls", suffix: "Premier", teams: [{ _id: "a", name: "A.Alpha Bravo/C.Charlie" }, { _id: "b", name: "D.Delta Echo/F.Foxtrot" }, { _id: "c", name: "A.Alpha Bravo/C.Charlie" }] }],
    matchList: [
      { _id: 1, type: "P", state: 2, courtNo: 1, time: 60, dayIndex: null, teams: [{ teamId: "a", scores: [21, 15, 15] }, { teamId: "b", scores: [18, 21, 10] }] },
      { _id: 2, type: "F", state: 1, courtNo: 3, time: 120, dayIndex: 0, teams: [{ teamId: "a", scores: [] }, { teamId: "c", scores: [] }] },
      { _id: 3, type: "F", state: 1, courtNo: 3, time: 180, dayIndex: 0, teams: [{ scores: [] }, { teamId: "c", scores: [] }] },
    ],
  },
};

describe("pair names", () => {
  it("keeps initials only", () => {
    expect(pairInitials("E.Kent Elmido/J.Reyes")).toBe("E.E. / J.R.");
    expect(pairInitials("Maria Lopez/Ana Cruz")).toBe("M.L. / A.C.");
  });
});

describe("mapMyteam", () => {
  const out = mapMyteam(myteam, { scheduleId: "9" });
  it("maps status, scores, pool and times, skipping undecided teams", () => {
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ external_id: "myteam-9-1", status: "final", pool: "Pool play", court_label: "1", division: "15U Girls Premier", start_at: "2026-04-21T14:00:00.000Z", date: "2026-04-21" });
    expect(out[0]!.result).toEqual({ home_sets: 2, away_sets: 1, set_scores: [[21, 18], [15, 21], [15, 10]] });
    expect(out[1]).toMatchObject({ status: "scheduled", pool: "Finals", result: null });
  });
  it("never exposes full names and disambiguates equal initials", () => {
    const names = out.flatMap((m) => [m.home, m.away]).join("|");
    expect(names).not.toMatch(/Alpha|Bravo|Charlie|Delta/);
    expect(out[1]!.home).not.toBe(out[1]!.away);
  });
  it("re-dates onto a demo day keeping Toronto clock time, and maps courts", () => {
    const m = mapMyteam(myteam, { scheduleId: "9", eventDate: "2026-10-18", courtMap: { "1": "5" } })[0]!;
    expect(m.date).toBe("2026-10-18");
    expect(m.start_at).toBe("2026-10-18T14:00:00.000Z"); // 10:00 Toronto, same clock time
    expect(m.court_label).toBe("5");
  });
  it("rejects a payload without a schedule", () => {
    expect(() => mapMyteam({} as MyteamSchedule, { scheduleId: "9" })).toThrow();
  });
});

describe("mapAesSchedule", () => {
  const day: AesCourtDay = {
    CourtSchedules: [
      { Name: "Court 5", CourtMatches: [
        { MatchId: 7, Division: { Name: "15U Girls" }, FirstTeamText: "Fake A 15 (3)", SecondTeamText: "Fake B 15 (9)", ScheduledStartDateTime: Date.parse("2026-04-20T13:00:00Z"), HasOutcome: true },
        { MatchId: 7, Division: { Name: "15U Girls" }, FirstTeamText: "Fake A 15 (3)", SecondTeamText: "Fake B 15 (9)", ScheduledStartDateTime: Date.parse("2026-04-20T13:00:00Z") },
        { MatchId: 8, FirstTeamText: "", SecondTeamText: "Fake C", ScheduledStartDateTime: Date.parse("2026-04-20T14:00:00Z") },
      ] },
      { Name: "Court 9", CourtMatches: [{ MatchId: 9, FirstTeamText: "Fake D", SecondTeamText: "Fake E", ScheduledStartDateTime: Date.parse("2026-04-20T15:00:00Z") }] },
    ],
  };
  it("dedupes, skips unassigned matches and strips team numbers", () => {
    const out = mapAesSchedule([day]);
    expect(out.map((m) => m.external_id)).toEqual(["aes7", "aes9"]);
    expect(out[0]).toMatchObject({ home: "Fake A 15", away: "Fake B 15", court_label: "5", status: "scheduled", date: "2026-04-20" });
  });
  it("filters by court", () => {
    expect(mapAesSchedule([day], { onlyCourts: ["9"] }).map((m) => m.external_id)).toEqual(["aes9"]);
  });
});

describe("provenance and live adapters", () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-17T20:00:00Z")); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it("labels by date", () => {
    const now = Date.now();
    expect(realDataProvenance("2026-04-21", now)).toBe("snapshot");
    expect(realDataProvenance("2026-10-17", now)).toBe("live");
    expect(realDataProvenance("2026-10-18", now, true)).toBe("sample");
  });
  it("MyTeam live path is gated by schedule_id and labels past data as a snapshot", async () => {
    const src = { id: "s", kind: "myteam", name: "MyTeam", config: { schedule_id: "9" } };
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(myteam))));
    const out = adapters.myteam.map(await adapters.myteam.fetch(src));
    expect(out.provenance).toBe("snapshot");
    expect(out.replaceSourceMatches).toBe(true);
    const demo = adapters.myteam.map(await adapters.myteam.fetch({ ...src, config: { schedule_id: "9", event_date: "2026-10-18" } }));
    expect(demo.provenance).toBe("sample");
    const mock = adapters.myteam.map(await adapters.myteam.fetch({ ...src, config: {} }));
    expect(mock.provenance).toBe("snapshot");
    expect(mock.matches).toBeUndefined();
  });
  it("AES schedule path throws on 403 so last known data stays", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 403 })));
    await expect(adapters.aes.fetch({ id: "s", kind: "aes", name: "AES", config: { event_key: "k", schedule_dates: ["2026-04-20"] } })).rejects.toThrow("403");
  });
  it("AES schedule path never deletes existing matches", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ CourtSchedules: [{ Name: "Court 5", CourtMatches: [{ MatchId: 1, FirstTeamText: "A", SecondTeamText: "B", ScheduledStartDateTime: Date.parse("2026-10-18T13:00:00Z") }] }] }))));
    const out = adapters.aes.map(await adapters.aes.fetch({ id: "s", kind: "aes", name: "AES", config: { event_key: "k", schedule_dates: ["2026-10-18"] } }));
    expect(out.provenance).toBe("live");
    expect(out.replaceSourceMatches).toBeUndefined();
  });
  it("TIMU live data moved to a demo date is sample", () => {
    const g = { match_no: "t1", division: "15U Girls", pool: "A", date: "2026-10-18", time: "09:00", court: "1", home: "X", away: "Y", status: "scheduled", sets: [] as [number, number][] };
    const out = adapters.timu.map({ games: [g], live: true, redated: true });
    expect(out.provenance).toBe("sample");
  });
});
