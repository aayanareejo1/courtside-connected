import { afterEach, describe, expect, it, vi } from "vitest";
const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from } }));
import { eventContentQuery } from "@/lib/event-content";
import { CONTENT_CACHE_KEY, writeCache } from "@/lib/offline-cache";
const saved = {
  event: { id: "event1", name: "OVA" }, info: [], slots: [],
  announcements: [
    { id: "future", title: "Court update", body: "Hall A", severity: "urgent", starts_at: "2026-10-18T14:00:00Z", ends_at: "2026-10-18T15:00:00Z", published: true },
    { id: "expired", title: "Old update", body: "", severity: "info", starts_at: null, ends_at: "2026-10-18T13:00:00Z", published: true },
  ],
};
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
describe("offline announcement loading", () => {
  it("loads saved announcements offline without querying canonical tables", async () => {
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);
    writeCache(window.localStorage, saved, 12345, CONTENT_CACHE_KEY);
    const queryFn = eventContentQuery.queryFn;
    if (typeof queryFn !== "function") throw Error("Missing query function");
    const result = await queryFn({} as never);
    expect(result.announcements.map((a) => a.id)).toEqual(["future", "expired"]);
    expect(result.offlineSavedAt).toBe(12345);
    expect(from).not.toHaveBeenCalled();
  });
  it("activates a future saved announcement using the current venue instant", () => {
    vi.useFakeTimers(); vi.setSystemTime("2026-10-18T14:30:00Z");
    const select = eventContentQuery.select;
    if (!select) throw Error("Missing selector");
    expect(select({ ...saved, offlineSavedAt: 12345 } as never).announcements.map((a) => a.id)).toEqual(["future"]);
  });
  it("does not show expired saved announcements", () => {
    vi.useFakeTimers(); vi.setSystemTime("2026-10-18T15:30:00Z");
    const select = eventContentQuery.select;
    if (!select) throw Error("Missing selector");
    expect(select({ ...saved, offlineSavedAt: 12345 } as never).announcements).toEqual([]);
  });
});
