// Pure rules for showing data-source freshness to spectators.
export type SourceHealth = "ok" | "stale" | "failed" | "never";

export const STALE_AFTER_MINUTES = 10;

export function sourceHealth(source: { last_status: string | null; last_success_at: string | null }, now: number): SourceHealth {
  if (source.last_status === "error") return source.last_success_at ? "failed" : "never";
  if (!source.last_success_at) return "never";
  return now - Date.parse(source.last_success_at) > STALE_AFTER_MINUTES * 60_000 ? "stale" : "ok";
}

// What kind of data a sync run actually produced. "ok" alone never means live.
export type Provenance = "live" | "sample" | "snapshot" | "metadata";
export const PROVENANCES: readonly Provenance[] = ["live", "sample", "snapshot", "metadata"];

export function asProvenance(value: string | null | undefined): Provenance {
  return PROVENANCES.includes(value as Provenance) ? (value as Provenance) : "sample";
}
