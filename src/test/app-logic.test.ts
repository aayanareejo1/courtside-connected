import { describe, expect, it } from "vitest";
import { DEMO_START, demoClock, nextDemoState } from "@/lib/clock";
import { buildCalendar, toIcs } from "@/lib/calendar";
import { buildFacts, fallbackAnswer, matchPlayers, parseAskRequest, parseQuantity, sanitizeAnswer } from "@/lib/ask-courtside";
import { KNOWN_LINKS } from "@/lib/ask-knowledge";
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
  const t0 = Date.parse("2026-04-19T16:30:00Z");
  const data = {
    teams: [{ id: "T1", name: "Lakeshore Storm 13U", club_id: "c", divisions: { name: "13U Girls" } }, { id: "X", name: "Kingston Tide 13U" }],
    players: [{ id: "p1", team_id: "T1", display_name: "Aayan A.", jersey_number: 16 }, { id: "p2", team_id: "X", display_name: "Olivia C.", jersey_number: 1 }],
    clubs: [{ id: "c", name: "Lakeshore Storm" }],
    courts: [{ id: "5", label: "5", areas: { name: "Hall 1" } }],
    sources: [{ id: "s", last_provenance: "sample" }],
    matches: [m("a", "2026-04-19T17:00:00Z", "5", "T1", "X"), m("b", "2026-04-20T15:00:00Z", "5", "X", "T1")],
  };
  const content = { event: { name: "Ontario Championships", venues: { name: "Enercare Centre", address: "100 Princes Blvd" } }, info: [{ category: "tickets", title: "Buy tickets", url: "https://tickets.example/event?qty={qty}", description: "Game admission" }], slots: [], announcements: [] };
  const req = (question: string, follows: { type: "team" | "player"; id: string }[] = []) => ({ question, follows });

  it("validates requests and reads ticket quantities", () => {
    expect(parseAskRequest({ question: "" })).toBeNull();
    expect(parseAskRequest({ question: "x".repeat(301) })).toBeNull();
    expect(parseAskRequest({ question: " Where? ", follows: [{ type: "team", id: "t" }, { type: "bad", id: "z" }], now: 5 })).toEqual({ question: "Where?", follows: [{ type: "team", id: "t" }], now: 5 });
    expect([parseQuantity("buy 3 tickets"), parseQuantity("two tickets please"), parseQuantity("tickets"), parseQuantity("99 tickets")]).toEqual([3, 2, null, null]);
  });
  it("finds a player from 'aayan.A' and shows team, division, club and the next match with court and hall", () => {
    expect(matchPlayers("where is aayan.A playing", data.players).map((p) => p.id)).toEqual(["p1"]);
    expect(matchPlayers("where is aayan.B playing", data.players)).toEqual([]);
    const f = buildFacts(data, content, req("where is aayan.A playing"), t0);
    expect(f.playerLines[0]).toContain("Lakeshore Storm 13U");
    expect(f.playerLines[0]).toContain("13U Girls");
    expect(f.matchLines[0]).toContain("Court 5, Hall 1");
    expect(f.matchLines[0]).toContain("Sample data, not live");
    expect(f.matchLines[0]).toContain("be at the court by 12:45");
  });
  it("fills the ticket quantity into the staff managed tickets link", () => {
    const f = buildFacts(data, content, req("where can I buy 3 tickets for tomorrow"), t0);
    expect(f.links[0]!.url).toBe("https://tickets.example/event?qty=3");
    expect(f.intent.tickets && f.intent.day === "tomorrow").toBe(true);
    expect(f.matchLines.some((l) => l.includes("Apr 20"))).toBe(true);
    const out = fallbackAnswer(f);
    expect(out.answer).toContain("For 3 tickets");
    expect(out.links[0]!.url).toContain("qty=3");
  });
  it("shows the next unfinished match, not a finished one, and no clash flags without follows", () => {
    const d = { ...data, matches: [m("done", "2026-04-19T15:00:00Z", "5", "T1", "X", "final"), data.matches[0]!] };
    const f = buildFacts(d, content, req("where is aayan.A playing"), t0);
    const out = fallbackAnswer(f).answer;
    expect(out).toContain("1:00 p.m.");
    expect(out).not.toContain("CLASH");
  });
  it("lists tomorrow's games when asked about tomorrow", () => {
    const out = fallbackAnswer(buildFacts(data, content, req("buy 3 tickets for tomorrow"), t0)).answer;
    expect(out).toContain("Games tomorrow");
    expect(out).toContain("Apr 20");
  });
  it("answers sponsor questions with the sponsor page and contact", () => {
    const out = fallbackAnswer(buildFacts(data, content, req("how do I become a sponsor"), t0));
    expect(out.answer).toContain("Kerish Maharaj");
    expect(out.links[0]!.url).toBe("https://www.ontariovolleyball.org/ocs-sponsorship");
  });
  it("keeps only links it was given and never exposes private links", () => {
    const f = buildFacts(data, content, req("hotels"), t0);
    const out = sanitizeAnswer("Book [here](https://evil.example/x) or [hotels](https://www.ontariovolleyball.org/accommodations). Also https://evil.example/y.", f.links);
    expect(out.answer).not.toContain("evil.example");
    expect(out.links.map((l) => l.url)).toEqual(["https://www.ontariovolleyball.org/accommodations"]);
    expect(f.links.some((l) => l.url.includes("docs.google.com") || l.url.includes("catalyst2026"))).toBe(false);
  });
  it("offers every case study link for a use", () => {
    const cats = new Set(KNOWN_LINKS.map((l) => l.category));
    for (const c of ["results", "event", "venue", "sponsor", "hotel", "rules", "social", "raffle", "merch", "registration"]) expect(cats.has(c)).toBe(true);
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
