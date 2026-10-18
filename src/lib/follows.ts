import { useSyncExternalStore } from "react";

export type Follow = { type: "team" | "player"; id: string };
export const followsKey = "courtside-follows";
const empty: Follow[] = [];
let cachedRaw: string | null = null;
let cached: Follow[] = empty;
let memoryOnly = false;
const listeners = new Set<() => void>();

export function parseFollows(raw: string | null): Follow[] {
  try {
    const value: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((v): v is Follow => v != null && (v.type === "team" || v.type === "player") && typeof v.id === "string")
      .filter((v, i, all) => all.findIndex((other) => other.type === v.type && other.id === v.id) === i);
  } catch { return []; }
}

function snapshot() {
  if (memoryOnly) return cached;
  try {
    const raw = localStorage.getItem(followsKey);
    if (raw !== cachedRaw) { cachedRaw = raw; cached = parseFollows(raw); }
  } catch { /* Keep in-memory follows if device storage is unavailable. */ }
  return cached;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => { listeners.delete(listener); window.removeEventListener("storage", listener); };
}

export function useFollows() {
  const follows = useSyncExternalStore(subscribe, snapshot, () => empty);
  const toggle = (item: Follow) => {
    const current = snapshot();
    cached = current.some((v) => v.type === item.type && v.id === item.id)
      ? current.filter((v) => v.type !== item.type || v.id !== item.id) : [...current, item];
    cachedRaw = JSON.stringify(cached);
    try { localStorage.setItem(followsKey, cachedRaw); } catch { memoryOnly = true; }
    listeners.forEach((listener) => listener());
  };
  return { follows, toggle };
}
