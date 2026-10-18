import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { CACHE_KEY, CONTENT_CACHE_KEY, readCache, savedData, withDeviceCache, writeCache } from "@/lib/offline-cache";
const mem = () => {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } } as Storage;
};
afterEach(() => { vi.useRealTimers(); });
describe("device offline cache", () => {
  it("stores the loaded schedule and its exact save time", async () => {
    const storage = mem();
    const schedule = { matches: [{ id: "m1", start_at: "2026-10-18T13:00:00Z", court_id: "court5" }] };
    expect(await withDeviceCache(async () => schedule, storage, CACHE_KEY, { now: () => 1000 })).toEqual({ ...schedule, offlineSavedAt: null });
    expect(readCache(storage)).toEqual({ data: schedule, savedAt: 1000 });
  });
  it("shows saved schedule offline without sending a request", async () => {
    const storage = mem(); writeCache(storage, { matches: [{ id: "m1" }] }, 2000);
    const load = vi.fn();
    expect(await withDeviceCache(load, storage, CACHE_KEY, { online: false })).toEqual({ matches: [{ id: "m1" }], offlineSavedAt: 2000 });
    expect(load).not.toHaveBeenCalled();
  });
  it("retains the saved data and timestamp after a failed refresh", async () => {
    const storage = mem(); writeCache(storage, { matches: [{ id: "m1" }] }, 3000);
    const result = await withDeviceCache(async () => { throw Error("Wi-Fi"); }, storage);
    expect(result).toEqual({ matches: [{ id: "m1" }], offlineSavedAt: 3000 });
    expect(readCache(storage)?.savedAt).toBe(3000);
  });
  it("does not replace saved matches with a late response after timeout", async () => {
    vi.useFakeTimers(); const storage = mem(); writeCache(storage, { matches: ["saved"] }, 4000);
    let finish: ((data: { matches: string[] }) => void) | undefined;
    const result = withDeviceCache(() => new Promise<{ matches: string[] }>((resolve) => { finish = resolve; }), storage, CACHE_KEY, { online: true, timeoutMs: 50 });
    await vi.advanceTimersByTimeAsync(50);
    expect(await result).toEqual({ matches: ["saved"], offlineSavedAt: 4000 });
    finish?.({ matches: ["late"] }); await Promise.resolve();
    expect(readCache<{ matches: string[] }>(storage)?.data.matches).toEqual(["saved"]);
  });
  it("keeps schedule and announcement caches separate", async () => {
    const storage = mem(); writeCache(storage, { matches: ["m1"] }, 5000);
    writeCache(storage, { announcements: [{ id: "a1", severity: "urgent" }] }, 6000, CONTENT_CACHE_KEY);
    expect(await withDeviceCache(async () => { throw Error("offline"); }, storage, CONTENT_CACHE_KEY)).toEqual({ announcements: [{ id: "a1", severity: "urgent" }], offlineSavedAt: 6000 });
    expect(readCache<{ matches: string[] }>(storage)?.data.matches).toEqual(["m1"]);
  });
  it("rejects missing caches instead of inventing empty schedules", async () => {
    await expect(withDeviceCache(async () => { throw Error("offline"); }, mem(), "missing")).rejects.toThrow("offline");
  });
  it.each(["{", '{"savedAt":"yesterday","data":{}}', '{"savedAt":-1,"data":{}}', '{"savedAt":1,"data":null}', '{"savedAt":1,"data":"bad"}'])("ignores invalid cache %s", (value) => {
    const storage = mem(); storage.setItem(CACHE_KEY, value); expect(readCache(storage)).toBeNull();
  });
  it("returns fresh data when saving is blocked", async () => {
    const storage = { getItem: () => { throw Error("blocked"); }, setItem: () => { throw Error("blocked"); } } as unknown as Storage;
    expect(await withDeviceCache(async () => ({ matches: ["fresh"] }), storage)).toEqual({ matches: ["fresh"], offlineSavedAt: null });
  });
  it("refreshes successfully after offline recovery", async () => {
    const storage = mem(); writeCache(storage, { matches: ["old"] }, 7000);
    expect(await withDeviceCache(async () => ({ matches: ["new"] }), storage, CACHE_KEY, { online: true, now: () => 8000 })).toEqual({ matches: ["new"], offlineSavedAt: null });
    expect(readCache(storage)).toEqual({ data: { matches: ["new"] }, savedAt: 8000 });
  });
  it("makes cached rows available while a background refresh is still pending", () => {
    const key = "courtside:test:pending"; writeCache(window.localStorage, { matches: ["saved"] }, 9000, key);
    const client = new QueryClient();
    const observerData = client.ensureQueryData({ queryKey: [key], initialData: () => savedData<{ matches: string[] }>(key), initialDataUpdatedAt: 0, queryFn: () => new Promise(() => {}), networkMode: "always" });
    expect(client.getQueryData([key])).toEqual({ matches: ["saved"], offlineSavedAt: 9000 });
    expect(observerData).toBeInstanceOf(Promise); client.clear();
  });
});
