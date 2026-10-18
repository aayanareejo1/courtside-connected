// Pure rules for showing data-source freshness to spectators.
export type SourceHealth = "ok" | "stale" | "failed" | "never";

export const STALE_AFTER_MINUTES = 10;

export function sourceHealth(source: { last_status: string | null; last_success_at: string | null }, now: number): SourceHealth {
  if (source.last_status === "error") return source.last_success_at ? "failed" : "never";
  if (!source.last_success_at || !Number.isFinite(Date.parse(source.last_success_at))) return "never";
  if (source.last_status === "stale") return "stale";
  return now - Date.parse(source.last_success_at) > STALE_AFTER_MINUTES * 60_000 ? "stale" : "ok";
}

// What kind of data a sync run actually produced. "ok" alone never means live.
export type Provenance = "live" | "sample" | "snapshot" | "metadata";
export const PROVENANCES: readonly Provenance[] = ["live", "sample", "snapshot", "metadata"];

export function asProvenance(value: string | null | undefined): Provenance {
  return PROVENANCES.includes(value as Provenance) ? (value as Provenance) : "sample";
}

export type MatchSource = {
  id: string;
  name: string;
  last_status: string | null;
  last_success_at: string | null;
  last_provenance: string | null;
};
export type SourcedMatch = { source_id?: string | null };
export type SourceNotice = {
  source: MatchSource | null;
  provenance: Provenance;
  health: SourceHealth;
  updatedAt: string | null;
};

// Explicit match attribution wins. Missing attribution is conservatively sample,
// never guessed from a day/division that might use a different source.
export function matchSourceNotices(matches: readonly SourcedMatch[], sources: readonly MatchSource[], now: number, savedAt: number | null = null): SourceNotice[] {
  const ids = new Set(matches.map((match) => match.source_id ?? null));
  return Array.from(ids, (id) => {
    const source = sources.find((candidate) => candidate.id === id) ?? null;
    const health = source ? sourceHealth(source, now) : "never";
    const last = source?.last_success_at;
    const updatedAt = last && Number.isFinite(Date.parse(last)) ? last : null;
    return { source, health, updatedAt: updatedAt ?? (savedAt !== null ? new Date(savedAt).toISOString() : null),
      provenance: savedAt !== null ? "snapshot" : asProvenance(source?.last_provenance) };
  });
}

// Real data is live only while its event day is today or later (Toronto time); earlier days are saved results.
// Real data moved to a demo date is not real any more, so it is sample.
export function realDataProvenance(eventDate: string | null | undefined, now: number, redated = false): Provenance {
  if (redated) return "sample";
  if (!eventDate) return "live";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto" }).format(now);
  return eventDate < today ? "snapshot" : "live";
}
