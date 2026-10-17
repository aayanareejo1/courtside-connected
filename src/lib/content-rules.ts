export function safeExternalUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : undefined;
  } catch { return undefined; }
}

export function activeAnnouncements<T extends { published: boolean; starts_at: string | null; ends_at: string | null; severity: string }>(rows: T[], now: number): T[] {
  const priority: Record<string, number> = { urgent: 0, important: 1, info: 2 };
  return rows.filter((row) => row.published && (!row.starts_at || Date.parse(row.starts_at) <= now) && (!row.ends_at || Date.parse(row.ends_at) > now))
    .sort((a, b) => (priority[a.severity] ?? 2) - (priority[b.severity] ?? 2));
}

type Targeted = { division_id?: string | null; area_id?: string | null };
// Everyone sees untargeted updates; targeted ones only show where the division or hall matches.
export const generalAnnouncements = <T extends Targeted>(rows: T[]) => rows.filter((r) => !r.division_id && !r.area_id);
export function targetedAnnouncements<T extends Targeted>(rows: T[], target: { divisionIds?: (string | null | undefined)[]; areaIds?: (string | null | undefined)[] }): T[] {
  const d = new Set((target.divisionIds ?? []).filter(Boolean));
  const a = new Set((target.areaIds ?? []).filter(Boolean));
  return rows.filter((r) => (r.division_id && d.has(r.division_id)) || (r.area_id && a.has(r.area_id)));
}
