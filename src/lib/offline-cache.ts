// Public canonical event data only. Staff/session data must never use these caches.
export const CACHE_KEY = "courtside:v1:event-directory";
export const CONTENT_CACHE_KEY = "courtside:v1:event-content";
export const VENUE_CACHE_KEY = "courtside:v1:venue-map";
export type Cached<T> = { savedAt: number; data: T };
type Store = Pick<Storage, "getItem" | "setItem">;
const memory = new Map<string, Cached<unknown>>();

export function deviceStorage(): Store | undefined {
  try { return typeof window === "undefined" ? undefined : window.localStorage; }
  catch { return undefined; }
}

export function readCache<T>(storage: Pick<Storage, "getItem"> | undefined, key = CACHE_KEY): Cached<T> | null {
  try {
    const raw = storage?.getItem(key);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || !("savedAt" in value) || !("data" in value)) return null;
    const { savedAt, data } = value;
    if (typeof savedAt !== "number" || !Number.isFinite(savedAt) || savedAt < 0 || data === null || typeof data !== "object") return null;
    return { savedAt, data: data as T };
  } catch { return null; }
}

export function writeCache<T>(storage: Pick<Storage, "setItem"> | undefined, data: T, now = Date.now(), key = CACHE_KEY) {
  if (!Number.isFinite(now) || now < 0) return;
  try { storage?.setItem(key, JSON.stringify({ savedAt: now, data })); } catch { /* full or blocked */ }
}

export function savedData<T extends object>(key = CACHE_KEY): (T & { offlineSavedAt: number | null }) | undefined {
  if (typeof window === "undefined") return undefined;
  const cached = readCache<T>(deviceStorage(), key) ?? memory.get(key) as Cached<T> | undefined;
  return cached ? { ...cached.data, offlineSavedAt: cached.savedAt } : undefined;
}

export class ConnectionTimeout extends Error {
  constructor() { super("Connection timed out"); }
}

// Use a bounded wait when a saved copy exists; never let a late response replace it implicitly.
export async function withDeviceCache<T extends object>(
  load: () => Promise<T>, storage: Store | undefined, key = CACHE_KEY,
  options: { online?: boolean; timeoutMs?: number; now?: () => number } = {},
): Promise<T & { offlineSavedAt: number | null }> {
  const cached = readCache<T>(storage, key) ?? (typeof window !== "undefined" ? memory.get(key) as Cached<T> | undefined : undefined);
  const online = options.online ?? (typeof navigator === "undefined" || navigator.onLine);
  if (!online && cached) return { ...cached.data, offlineSavedAt: cached.savedAt };
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const pending = load();
    const data = cached ? await Promise.race([pending, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new ConnectionTimeout()), options.timeoutMs ?? 4000);
    })]) : await pending;
    const savedAt = (options.now ?? Date.now)();
    writeCache(storage, data, savedAt, key);
    if (typeof window !== "undefined") memory.set(key, { data, savedAt });
    return { ...data, offlineSavedAt: null };
  } catch (error) {
    if (!cached) throw error;
    return { ...cached.data, offlineSavedAt: cached.savedAt };
  } finally { if (timer !== undefined) clearTimeout(timer); }
}
