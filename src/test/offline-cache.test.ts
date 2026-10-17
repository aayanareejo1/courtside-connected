import { describe, expect, it } from "vitest";
import { readCache, withDeviceCache, writeCache } from "@/lib/offline-cache";

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } as Storage; };

describe("device cache for weak Wi-Fi", () => {
  it("saves fresh data and marks it live", async () => {
    const s = mem();
    const r = await withDeviceCache(async () => ({ n: 1 }), s);
    expect(r).toEqual({ n: 1, offlineSavedAt: null });
    expect(readCache<{ n: number }>(s)?.data.n).toBe(1);
  });
  it("falls back to the saved copy with its save time when loading fails", async () => {
    const s = mem();
    writeCache(s, { n: 2 }, 1000);
    expect(await withDeviceCache(async () => { throw new Error("offline"); }, s)).toEqual({ n: 2, offlineSavedAt: 1000 });
  });
  it("still fails when nothing was saved", async () => {
    await expect(withDeviceCache(async () => { throw new Error("offline"); }, mem())).rejects.toThrow("offline");
  });
});
