// Writes one adapter result into canonical tables. Everything is resolved before any write,
// so a bad batch throws and existing data stays untouched (last known good).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { AdapterResult } from "@/server/adapters";

type Db = SupabaseClient<Database>;

const must = <T>(r: { data: T | null; error: unknown }) => {
  if (r.error) throw r.error;
  return r.data as T;
};

export async function applySync(db: Db, sourceId: string, result: AdapterResult): Promise<number> {
  let rows = 0;
  const needLookups = (result.matches?.length ?? 0) + (result.rosters?.length ?? 0) > 0;
  const [teams, courts, divisions, days] = needLookups
    ? await Promise.all([
        db.from("teams").select("id,name").then(must),
        db.from("courts").select("id,label").then(must),
        db.from("divisions").select("id,name").then(must),
        db.from("event_days").select("id,date").then(must),
      ])
    : [[], [], [], []];
  const byName = <T extends { id: string }>(list: T[], key: keyof T) => new Map(list.map((x) => [String(x[key]), x.id]));
  const teamId = byName(teams, "name");
  const courtId = byName(courts, "label");
  const divId = byName(divisions, "name");
  if (result.createMissingTeams !== undefined) {
    const division_id = divId.get(result.createMissingTeams) ?? null;
    const missing = [...new Set((result.matches ?? []).flatMap((m) => [m.home, m.away]))].filter((n) => !teamId.has(n));
    if (missing.length) for (const t of must(await db.from("teams").insert(missing.map((name) => ({ name, division_id }))).select("id,name"))) teamId.set(t.name, t.id);
  }
  const dayId = byName(days, "date");

  // Resolve matches fully first.
  const matchRows = (result.matches ?? []).map((m) => {
    const home = teamId.get(m.home);
    const away = teamId.get(m.away);
    const day = dayId.get(m.date);
    if (!home || !away) throw new Error(`Unknown team in ${m.external_id}`);
    if (!day) throw new Error(`Unknown event day ${m.date}`);
    return {
      row: {
        source_id: sourceId,
        external_id: m.external_id,
        event_day_id: day,
        division_id: divId.get(m.division) ?? null,
        court_id: courtId.get(m.court_label) ?? null, // unknown court keeps raw label
        court_label_raw: `Court ${m.court_label}`,
        start_at: m.start_at,
        home_team_id: home,
        away_team_id: away,
        status: m.status,
        pool: m.pool,
        time_estimated: m.time_estimated ?? false,
      },
      result: m.result,
    };
  });
  const rosterRows = (result.rosters ?? []).map((r) => {
    const id = teamId.get(r.team);
    if (!id) throw new Error(`Unknown roster team ${r.team}`);
    return { id, ...r };
  });

  if (matchRows.length) {
    const saved = must(await db.from("matches").upsert(matchRows.map((m) => m.row), { onConflict: "source_id,external_id" }).select("id,external_id"));
    const idByExt = new Map(saved.map((s) => [s.external_id, s.id]));
    const results = matchRows.filter((m) => m.result).map((m) => ({ match_id: idByExt.get(m.row.external_id)!, ...m.result!, updated_at: new Date().toISOString() }));
    if (results.length) must(await db.from("results").upsert(results, { onConflict: "match_id" }));
    // A match the source now reports without a result must not keep an old score.
    const cleared = matchRows.filter((m) => !m.result).map((m) => idByExt.get(m.row.external_id)!);
    if (cleared.length) must(await db.from("results").delete().in("match_id", cleared));
    rows += saved.length;
    if (result.replaceSourceMatches) {
      const stale = must(await db.from("matches").select("id,external_id").eq("source_id", sourceId)).filter((m) => !idByExt.has(m.external_id)).map((m) => m.id);
      if (stale.length) must(await db.from("matches").delete().in("id", stale));
    }
  }
  for (const r of rosterRows) {
    // Players are matched by jersey so existing IDs (and device follows) survive a roster refresh.
    const existing = must(await db.from("players").select("id,jersey_number").eq("team_id", r.id));
    const byJersey = new Map(existing.map((p) => [p.jersey_number, p.id]));
    const keep = new Set<string>();
    for (const p of r.players) {
      const id = byJersey.get(p.jersey_number);
      if (id) {
        keep.add(id);
        must(await db.from("players").update({ display_name: p.display_name }).eq("id", id));
      } else must(await db.from("players").insert({ team_id: r.id, ...p }));
    }
    const drop = existing.filter((p) => !keep.has(p.id)).map((p) => p.id);
    if (drop.length) must(await db.from("players").delete().in("id", drop));
    must(await db.from("staff_members").delete().eq("team_id", r.id));
    if (r.staff.length) must(await db.from("staff_members").insert(r.staff.map((s) => ({ team_id: r.id, ...s }))));
    rows += r.players.length + r.staff.length;
  }
  for (const u of result.statusUpdates ?? []) {
    must(await db.from("matches").update({ status: u.status }).eq("source_id", sourceId).eq("external_id", u.external_id));
    rows++;
  }
  return rows;
}
