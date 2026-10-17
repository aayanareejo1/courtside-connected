// Last loaded event data kept on the device so schedules stay readable on weak venue Wi-Fi.
export const CACHE_KEY = "courtside:v1:event-directory";
export type Cached<T> = { savedAt: number; data: T };

export function readCache<T>(storage: Pick<Storage, "getItem"> | undefined): Cached<T> | null {
  try {
    const raw = storage?.getItem(CACHE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Cached<T>) : null;
    return parsed && typeof parsed.savedAt === "number" && parsed.data ? parsed : null;
  } catch {
    return null;
  }
}

export function writeCache<T>(storage: Pick<Storage, "setItem"> | undefined, data: T, now = Date.now()) {
  try { storage?.setItem(CACHE_KEY, JSON.stringify({ savedAt: now, data })); } catch { /* storage full or blocked */ }
}

// Fresh data wins; on failure fall back to the device copy, otherwise rethrow.
export async function withDeviceCache<T>(load: () => Promise<T>, storage: Storage | undefined): Promise<T & { offlineSavedAt: number | null }> {
  try {
    const data = await load();
    writeCache(storage, data);
    return { ...data, offlineSavedAt: null };
  } catch (e) {
    const cached = readCache<T>(storage);
    if (!cached) throw e;
    return { ...cached.data, offlineSavedAt: cached.savedAt };
  }
}
