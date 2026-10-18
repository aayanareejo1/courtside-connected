// Source adapters: each maps one platform's payload into canonical rows.
// Mock adapters return the same shape a live source would; swap `fetch` for a real HTTP call later.
import { mapAesSchedule, mapMyteam, mapTimu, parseTimuHtml, parseRosterCsv, type AesCourtDay, type CanonicalMatch, type MyteamSchedule, type RosterTeam, type TimuGame } from "@/lib/source-mapping";
import { realDataProvenance, type Provenance } from "@/lib/source-status";
import { timuDay1 } from "@/server/fixtures/timu-day1";
import { speerRosterCsv } from "@/server/fixtures/speer-roster";

export type StatusUpdate = { external_id: string; status: string };
export type AdapterResult = { provenance: Provenance; createMissingTeams?: string; replaceSourceMatches?: boolean; statusUpdates?: StatusUpdate[]; matches?: CanonicalMatch[]; rosters?: RosterTeam[] };
export type SourceRow = { id: string; kind: string; name: string; config: Record<string, unknown> | null };

export interface SourceAdapter {
  kind: string;
  fetch(source: SourceRow): Promise<unknown>;
  map(payload: unknown): AdapterResult;
}

const failIfSimulated = (source: SourceRow) => {
  if (source.config?.["simulate_failure"]) throw new Error(`${source.name} did not respond`);
};

type StatusPayload = { games?: { ref: string; state: string }[] };
const statusMap = (provenance: Provenance) => (payload: unknown): AdapterResult => ({
  provenance,
  statusUpdates: ((payload as StatusPayload).games ?? []).map((g) => ({ external_id: g.ref, status: g.state })),
});

function statusMockAdapter(kind: string, provenance: Provenance): SourceAdapter {
  return {
    kind,
    async fetch(source) {
      failIfSimulated(source);
      return { games: (source.config?.["mock_games"] as StatusPayload["games"]) ?? [] } satisfies StatusPayload;
    },
    map: statusMap(provenance),
  };
}

// TIMU: live results.php when config.live_tid is set, otherwise the sample Day 1 fixture.
// A live failure throws, so the run is recorded as an error and the last known data stays in place.
const timuMock: SourceAdapter = {
  kind: "timu",
  async fetch(source) {
    failIfSimulated(source);
    const tid = source.config?.["live_tid"];
    if (typeof tid !== "string" && typeof tid !== "number") return timuDay1;
    try {
      const res = await fetch(`https://www.timu.ca/scoreboards/results.php?tid=${encodeURIComponent(String(tid))}`, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`TIMU responded ${res.status}`);
      const parsed = parseTimuHtml(await res.text(), {
        division: String(source.config?.["division"] ?? timuDay1.games[0]!.division),
        courtMap: source.config?.["court_map"] as Record<string, string> | undefined,
        teamAliases: source.config?.["team_aliases"] as Record<string, string> | undefined,
      });
      const day = source.config?.["event_date"];
      if (typeof day === "string") parsed.games.forEach((g) => (g.date = day));
      return { ...parsed, live: true, redated: typeof day === "string" };
    } catch (e) {
      console.error("TIMU live failed", e);
      throw e instanceof Error ? e : new Error("TIMU live fetch failed");
    }
  },
  map: (payload) => {
    const p = payload as { games: TimuGame[]; live?: boolean; redated?: boolean };
    const matches = mapTimu(p);
    // Live TIMU teams are new to the app: create them in the division and drop the sample matches.
    // Label by the data's own date: past days are snapshots, and data moved to a demo date is sample.
    return p.live ? { provenance: realDataProvenance(matches[0]?.date, Date.now(), p.redated), matches, createMissingTeams: matches[0]?.division ?? "", replaceSourceMatches: true } : { provenance: "sample", matches };
  },
};

// Mock Speer: roster CSV in the sample format. Swap fetch for the real export once Speer has one.
const speerMock: SourceAdapter = {
  kind: "speer",
  async fetch(source) {
    failIfSimulated(source);
    return speerRosterCsv;
  },
  map: (payload) => ({ provenance: "sample", rosters: parseRosterCsv(String(payload)) }),
};

// Fetches JSON with a timeout; any failure throws so the run is recorded as an error and last known data stays.
async function getJson(url: string, name: string): Promise<unknown> {
  const res = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`${name} responded ${res.status}`);
  return res.json();
}

// MyTeam: live beach schedule when config.schedule_id is set (names become initials), otherwise the status mock.
// Optional config: division, event_date (demo re-date, then labelled sample), court_map.
const myteamMock = statusMockAdapter("myteam", "snapshot");
const myteamLive: SourceAdapter = {
  kind: "myteam",
  async fetch(source) {
    failIfSimulated(source);
    const id = source.config?.["schedule_id"];
    if (typeof id !== "string" && typeof id !== "number") return myteamMock.fetch(source);
    const scheduleId = String(id);
    const schedule = (await getJson(`https://myteamclick.herokuapp.com/volley/schedule/${encodeURIComponent(scheduleId)}`, "MyTeam")) as MyteamSchedule;
    if (schedule.success !== true) throw new Error("MyTeam did not return a schedule");
    const c = source.config ?? {};
    return {
      schedule,
      opts: { scheduleId, division: typeof c["division"] === "string" ? c["division"] : undefined, eventDate: typeof c["event_date"] === "string" ? c["event_date"] : undefined, courtMap: c["court_map"] as Record<string, string> | undefined },
    };
  },
  map: (payload) => {
    const p = payload as { schedule?: MyteamSchedule; opts: Parameters<typeof mapMyteam>[1] };
    if (!p.schedule) return statusMap("snapshot")(payload);
    const matches = mapMyteam(p.schedule, p.opts);
    return { provenance: realDataProvenance(matches[0]?.date, Date.now(), p.opts.eventDate !== undefined), matches, createMissingTeams: p.opts.division ?? matches[0]?.division ?? "", replaceSourceMatches: true };
  },
};

// AES: real court schedule only when config.schedule_dates is set (server requests may be refused with 403, which
// is recorded as an error and never bypassed). Without it: event check only, then sample status updates.
// Optional config: schedule_param (default 240), only_courts. It never deletes rows, so seeded sample matches stay.
const aesLive: SourceAdapter = {
  kind: "aes",
  async fetch(source) {
    failIfSimulated(source);
    const key = source.config?.["event_key"];
    if (typeof key !== "string") return statusMockAdapter("aes", "sample").fetch(source);
    const base = `https://results.advancedeventsystems.com/api/event/${encodeURIComponent(key)}`;
    const dates = source.config?.["schedule_dates"];
    if (Array.isArray(dates) && dates.length) {
      const param = String(source.config?.["schedule_param"] ?? 240);
      const days = (await Promise.all(dates.map((d) => getJson(`${base}/courts/${encodeURIComponent(String(d))}/${encodeURIComponent(param)}`, "AES")))) as AesCourtDay[];
      return { days, onlyCourts: source.config?.["only_courts"] as string[] | undefined };
    }
    const body = (await getJson(base, "AES")) as { Key?: string };
    if (body.Key !== key) throw new Error("AES returned a different event");
    return { games: (source.config?.["mock_games"] as StatusPayload["games"]) ?? [] } satisfies StatusPayload;
  },
  map: (payload) => {
    const p = payload as { days?: AesCourtDay[]; onlyCourts?: string[] };
    if (!p.days) return statusMap("sample")(payload);
    const matches = mapAesSchedule(p.days, { onlyCourts: p.onlyCourts });
    return { provenance: realDataProvenance(matches[0]?.date, Date.now()), matches, createMissingTeams: "" };
  },
};

export const adapters = {
  timu: timuMock,
  aes: aesLive,
  myteam: myteamLive,
  speer: speerMock,
} satisfies Record<string, SourceAdapter>;
