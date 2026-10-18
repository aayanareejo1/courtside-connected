// Source adapters: each maps one platform's payload into canonical rows.
// Mock adapters return the same shape a live source would; swap `fetch` for a real HTTP call later.
import { mapTimu, parseTimuHtml, parseRosterCsv, type CanonicalMatch, type RosterTeam, type TimuGame } from "@/lib/source-mapping";
import type { Provenance } from "@/lib/source-status";
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
      return { ...parsed, live: true };
    } catch (e) {
      console.error("TIMU live failed", e);
      throw e instanceof Error ? e : new Error("TIMU live fetch failed");
    }
  },
  map: (payload) => {
    const p = payload as { games: TimuGame[]; live?: boolean };
    const matches = mapTimu(p);
    // Live TIMU teams are new to the app: create them in the division and drop the sample matches.
    return p.live ? { provenance: "live", matches, createMissingTeams: matches[0]?.division ?? "", replaceSourceMatches: true } : { provenance: "sample", matches };
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

// AES check: confirms the public event endpoint (metadata only, no matches or scores), then applies sample status updates.
const aesLive: SourceAdapter = {
  kind: "aes",
  async fetch(source) {
    const key = source.config?.["event_key"];
    if (typeof key !== "string") return statusMockAdapter("aes", "sample").fetch(source);
    const res = await fetch(`https://results.advancedeventsystems.com/api/event/${key}`, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`AES responded ${res.status}`);
    const body = (await res.json()) as { Key?: string };
    if (body.Key !== key) throw new Error("AES returned a different event");
    return { games: (source.config?.["mock_games"] as StatusPayload["games"]) ?? [] } satisfies StatusPayload;
  },
  map: statusMap("sample"),
};

export const adapters = {
  timu: timuMock,
  aes: aesLive,
  myteam: statusMockAdapter("myteam", "snapshot"),
  speer: speerMock,
} satisfies Record<string, SourceAdapter>;
