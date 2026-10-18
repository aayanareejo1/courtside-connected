import { describe, expect, it } from "vitest";
import { matchPlayers, type AskData } from "@/lib/ask-courtside";
import { appendVoiceText, buildVoiceFacts, readVoiceLinks, voiceHistory, type VoiceMessage } from "@/lib/voice-facts";

const data: AskData = {
  teams: [{ id: "storm", name: "Lakeshore Storm 13U" }],
  players: [{ id: "aayan", display_name: "Aayan A.", team_id: "storm", jersey_number: 16 }, { id: "alyssa", display_name: "Alyssa M.", team_id: "storm", jersey_number: null }],
  courts: [{ id: "17", label: "17", areas: { name: "Hall 2" } }], sources: [],
  matches: [{ id: "m", source_id: null, start_at: "2026-04-19T19:00:00Z", status: "scheduled", court_id: "17", court_label_raw: null, home_team_id: "storm", away_team_id: null, est_duration_min: 60, results: null }],
};
const content = { info: [{ category: "tickets", title: "Tickets", url: "https://tickets.example/buy?qty={qty}", description: "Admission" }], slots: [], announcements: [] };
const now = Date.parse("2026-04-19T16:30:00Z");

describe("voice event facts", () => {
  it("resolves Aayan and Alyssa with last initials and a repeated-vowel transcription difference", () => {
    expect(matchPlayers("Where is Ayan A playing?", data.players).map((p) => p.id)).toEqual(["aayan"]);
    expect(matchPlayers("Alyssa M", data.players).map((p) => p.id)).toEqual(["alyssa"]);
    expect(matchPlayers("Ayan B", data.players)).toEqual([]);
    const exact = [...data.players, { id: "other", display_name: "Ayan A.", team_id: "storm", jersey_number: 2 }];
    expect(matchPlayers("Ayan A", exact).map((p) => p.id)).toEqual(["other"]);
  });
  it("merges transcript fragments and retains the named player in a follow-up", () => {
    const messages: VoiceMessage[] = [];
    appendVoiceText(messages, "user", "Where is Aa");
    appendVoiceText(messages, "user", "yan A playing?");
    appendVoiceText(messages, "assistant", "Aayan plays for Lakeshore.");
    appendVoiceText(messages, "user", "When is my next match?");
    expect(messages).toHaveLength(3);
    const result = buildVoiceFacts(data, content, "When is my next match?", now, voiceHistory(messages));
    expect(result.facts).toContain("Aayan A. #16");
    expect(result.facts).toContain("Court 17, Hall 2");
  });
  it("keeps real link addresses and requested ticket quantities for the call screen", () => {
    const result = buildVoiceFacts(data, content, "Give me a link to buy 3 tickets", now, []);
    expect(result.links.find((l) => l.title === "Tickets")?.url).toBe("https://tickets.example/buy?qty=3");
    expect(readVoiceLinks(result.links).find((l) => l.title === "Tickets")?.url).toBe("https://tickets.example/buy?qty=3");
    expect(readVoiceLinks([{ title: "Unsafe", url: "javascript:alert(1)" }])).toEqual([]);
  });
});