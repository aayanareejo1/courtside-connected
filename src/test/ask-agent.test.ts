import { describe, expect, it } from "vitest";
import { runAgent, runTool, type CallModel, type ModelMessage, type ModelReply } from "@/lib/ask-tools";

const match = (id: string, start: string, home: string, away: string, status = "scheduled") =>
  ({ id, source_id: "s", start_at: start, status, court_id: "5", court_label_raw: null, home_team_id: home, away_team_id: away, est_duration_min: 60, results: null });
const data = {
  teams: [{ id: "T1", name: "Lakeshore Storm 13U", club_id: "c", divisions: { name: "13U Girls" } }, { id: "X", name: "Kingston Tide 13U", divisions: { name: "13U Girls" } }],
  players: [{ id: "p1", team_id: "T1", display_name: "Aayan A.", jersey_number: 16 }, { id: "p2", team_id: "X", display_name: "Aayan K.", jersey_number: 4 }],
  clubs: [{ id: "c", name: "Lakeshore Storm" }],
  courts: [{ id: "5", label: "5", areas: { name: "Hall 1" } }],
  sources: [{ id: "s", last_provenance: "sample" }],
  matches: [match("a", "2026-04-19T19:00:00Z", "T1", "X"), match("b", "2026-04-20T15:00:00Z", "X", "T1")],
  staff: [{ team_id: "T1", display_name: "Sam Lee", role: "Head coach" }],
};
const content = { event: { name: "Ontario Championships", venues: { name: "Enercare Centre", address: "100 Princes Blvd" } }, info: [{ category: "tickets", title: "Buy tickets", url: "https://tickets.example/e?qty={qty}", description: "Admission" }], slots: [], announcements: [] };
const ctx = { data, content, follows: [], now: Date.parse("2026-04-19T16:30:00Z") };

const text = (t: string): ModelReply => ({ content: [{ type: "text", text: t }], stop_reason: "end_turn" });
const use = (id: string, name: string, input: unknown): ModelReply => ({ content: [{ type: "tool_use", id, name, input }], stop_reason: "tool_use" });
const scripted = (replies: ModelReply[], seen: ModelMessage[][] = []): CallModel => async (_s, messages) => { seen.push(structuredClone(messages)); return replies.shift() ?? text("done"); };

describe("Ask Courtside agent", () => {
  it("tools find a player, give the profile and keep ids honest", () => {
    expect(runTool("find_players", { name: "Aayan" }, { ...ctx, links: new Map() })).toContain("player_id p2");
    expect(runTool("find_players", { name: "aayan A" }, { ...ctx, links: new Map() })).not.toContain("p2");
    const profile = runTool("get_profile", { player_id: "p1" }, { ...ctx, links: new Map() });
    expect(profile).toContain("Aayan A. (#16), Lakeshore Storm 13U, 13U Girls");
    expect(profile).toContain("Sam Lee (Head coach)");
    expect(profile).toContain("Apr 20");
    expect(runTool("get_profile", { player_id: "nope" }, { ...ctx, links: new Map() })).toBe("Unknown player or team.");
    expect(runTool("get_matches", { day: "today", team_id: "T1" }, { ...ctx, links: new Map() })).toContain("Court 5, Hall 1");
    expect(runTool("get_matches", { day: "tomorrow", team_id: "T1" }, { ...ctx, links: new Map() })).toContain("Apr 20");
    expect(runTool("wipe_everything", {}, { ...ctx, links: new Map() })).toBe("Unknown tool.");
  });
  it("asks who the child is, then looks the name up and summarises", async () => {
    const first = await runAgent({ callModel: scripted([text("What is your son's first name and last initial?")]), question: "is my son playing today", history: [], ctx });
    expect(first!.answer).toContain("first name and last initial");
    const seen: ModelMessage[][] = [];
    const out = await runAgent({
      callModel: scripted([use("1", "find_players", { name: "Aayan A" }), use("2", "get_profile", { player_id: "p1" }), text("Aayan A. (#16) plays for Lakeshore Storm 13U. Today at 3:00 p.m., Court 5, Hall 1.")], seen),
      question: "Aayan A", history: [{ question: "is my son playing today", answer: first!.answer }], ctx,
    });
    expect(out!.answer).toContain("Court 5, Hall 1");
    expect(seen).toHaveLength(3);
    const result = (seen[2]!.at(-1)!.content as { content: string }[])[0]!.content;
    expect(result).toContain("Sam Lee");
    expect(seen[0]![0]).toEqual({ role: "user", content: "is my son playing today" });
  });
  it("only lets links from tool results through, and fills the ticket quantity", async () => {
    const out = await runAgent({
      callModel: scripted([use("1", "get_links", { category: "tickets", quantity: 3 }), text("For 3 tickets use [Buy tickets](https://tickets.example/e?qty=3) not [this](https://evil.example/x).")]),
      question: "where do I buy 3 tickets", history: [], ctx,
    });
    expect(out!.answer).not.toContain("evil.example");
    expect(out!.links.map((l) => l.url)).toEqual(["https://tickets.example/e?qty=3"]);
  });
  it("gives up cleanly when the model never answers", async () => {
    const loop: CallModel = async () => use("x", "get_followed", {});
    expect(await runAgent({ callModel: loop, question: "hi", history: [], ctx })).toBeNull();
    expect(await runAgent({ callModel: async () => ({ content: [] }), question: "hi", history: [], ctx })).toBeNull();
  });
});
