import { describe, expect, it } from "vitest";
import { mapTimu, parseTimuHtml } from "@/lib/source-mapping";
import { timuSampleHtml } from "./fixtures-timu-sample";

describe("live TIMU parser", () => {
  const p = parseTimuHtml(timuSampleHtml, { division: "15U Girls", courtMap: { "1": "5" } });
  it("reads every match with pool, court and teams", () => {
    expect(p.games).toHaveLength(3);
    expect(p.games[0]).toMatchObject({ pool: "Pool A", court: "5", home: "Pakmen Gold Andrea", away: "Milton Edge Thunder", date: "2026-03-01", time: "09:00" });
  });
  it("reads set scores and marks decided matches final", () => {
    expect(p.games[0]!.sets).toEqual([[23, 25], [25, 20], [15, 8]]);
    expect(mapTimu(p)[0]!.result).toMatchObject({ home_sets: 2, away_sets: 1 });
    expect(p.games[0]!.status).toBe("final");
  });
  it("rejects a page with no matches", () => {
    expect(() => parseTimuHtml("<html></html>", { division: "x" })).toThrow();
  });
});

describe("estimated times", () => {
  it("flags live TIMU times as estimated and mock times as exact", async () => {
    const { timuDay1 } = await import("@/server/fixtures/timu-day1");
    expect(mapTimu(parseTimuHtml(timuSampleHtml, { division: "x" }))[0]!.time_estimated).toBe(true);
    expect(mapTimu(timuDay1)[0]!.time_estimated).toBe(false);
  });
});
