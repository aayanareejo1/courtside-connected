import { describe, expect, it } from "vitest";
import { sourceHealth } from "@/lib/source-status";
import { adapters } from "@/server/adapters";

const now = Date.parse("2026-10-17T20:00:00Z");
describe("source freshness", () => {
  it("keeps last known data and flags a failed source", () => {
    expect(sourceHealth({ last_status: "error", last_success_at: "2026-10-17T19:00:00Z" }, now)).toBe("failed");
  });
  it("is stale after 10 minutes without a successful update", () => {
    expect(sourceHealth({ last_status: "ok", last_success_at: "2026-10-17T19:49:00Z" }, now)).toBe("stale");
    expect(sourceHealth({ last_status: "ok", last_success_at: "2026-10-17T19:55:00Z" }, now)).toBe("ok");
  });
  it("reports never-synced sources", () => {
    expect(sourceHealth({ last_status: "never", last_success_at: null }, now)).toBe("never");
  });
});

describe("mock adapters", () => {
  it("map source games into canonical match updates", async () => {
    const src = { id: "s", kind: "aes", name: "AES", config: { mock_games: [{ ref: "m1", state: "final" }] } };
    const out = adapters.aes.map(await adapters.aes.fetch(src));
    expect(out.statusUpdates).toEqual([{ external_id: "m1", status: "final" }]);
  });
  it("fail loudly when a source is down", async () => {
    await expect(adapters.timu.fetch({ id: "s", kind: "timu", name: "TIMU", config: { simulate_failure: true } })).rejects.toThrow();
  });
});
