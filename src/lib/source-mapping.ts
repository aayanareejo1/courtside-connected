// Pure source-to-canonical mapping. No network or database access here so it can be tested.
import { torontoTimestamp } from "@/lib/admin-rules";

export type MatchStatus = "scheduled" | "live" | "final" | "cancelled";
export type CanonicalMatch = {
  external_id: string;
  division: string;
  pool: string | null;
  date: string; // venue date YYYY-MM-DD
  start_at: string; // ISO
  court_label: string;
  home: string;
  away: string;
  status: MatchStatus;
  time_estimated?: boolean;
  result: { home_sets: number; away_sets: number; set_scores: number[][] } | null;
};
export type RosterTeam = { team: string; players: { display_name: string; jersey_number: number | null }[]; staff: { display_name: string; role: string }[] };

// Minors: only first name + last initial ever leaves the adapter.
export const privateName = (first: string, last: string) => {
  const f = first.trim();
  const l = last.trim();
  if (!f) throw new Error("Missing first name");
  return l ? `${f} ${l[0]!.toUpperCase()}.` : f;
};

// ---------- TIMU (shape of timu.ca results.php: pool, match no, court, time, teams, set scores) ----------
export type TimuGame = { match_no: string; division: string; pool: string; date: string; time: string; court: string; home: string; away: string; status: string; sets: [number, number][]; time_estimated?: boolean };
const STATUS: Record<string, MatchStatus> = { scheduled: "scheduled", upcoming: "scheduled", live: "live", "in progress": "live", final: "final", complete: "final", cancelled: "cancelled" };

export function mapTimu(payload: { games: TimuGame[] }): CanonicalMatch[] {
  if (!Array.isArray(payload?.games)) throw new Error("TIMU payload has no games");
  return payload.games.map((g) => {
    const status = STATUS[String(g.status).toLowerCase()];
    if (!status) throw new Error(`Unknown TIMU status "${g.status}" for ${g.match_no}`);
    if (!g.match_no || !g.home || !g.away || !/^\d{4}-\d{2}-\d{2}$/.test(g.date) || !/^\d{2}:\d{2}$/.test(g.time)) throw new Error(`Incomplete TIMU game ${g.match_no ?? "?"}`);
    const sets = (g.sets ?? []).filter((s) => s.length === 2);
    const home_sets = sets.filter(([h, a]) => h > a).length;
    return {
      external_id: g.match_no,
      division: g.division,
      pool: g.pool || null,
      date: g.date,
      start_at: torontoTimestamp(`${g.date}T${g.time}`)!,
      court_label: String(g.court).replace(/^court\s*/i, "").trim(),
      home: g.home,
      away: g.away,
      status,
      time_estimated: g.time_estimated === true,
      result: sets.length ? { home_sets, away_sets: sets.length - home_sets, set_scores: sets } : null,
    };
  });
}

// ---------- Speer roster CSV (sample roster format) ----------
const COLUMNS = ["jersey_number", "first_name", "last_name", "club", "team", "age_category", "home_city", "role"] as const;

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export function parseRosterCsv(csv: string): RosterTeam[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  const header = splitCsvLine(lines.shift() ?? "").map((h) => h.toLowerCase());
  for (const col of COLUMNS) if (!header.includes(col)) throw new Error(`Roster CSV missing column "${col}"`);
  const teams = new Map<string, RosterTeam>();
  lines.forEach((line, i) => {
    const cells = splitCsvLine(line);
    const get = (c: (typeof COLUMNS)[number]) => cells[header.indexOf(c)] ?? "";
    const team = get("team");
    if (!team) throw new Error(`Row ${i + 2}: missing team`);
    const entry = teams.get(team) ?? { team, players: [], staff: [] };
    const role = get("role").toLowerCase();
    const name = privateName(get("first_name"), get("last_name"));
    if (role === "player") {
      const rawJersey = get("jersey_number").trim();
      const jersey = rawJersey ? Number(rawJersey) : null;
      if (jersey !== null && (!Number.isInteger(jersey) || jersey < 0 || jersey > 99)) throw new Error(`Row ${i + 2}: invalid jersey number`);
      if (jersey !== null && entry.players.some((p) => p.jersey_number === jersey)) throw new Error(`Row ${i + 2}: duplicate jersey ${jersey}`);
      entry.players.push({ display_name: name, jersey_number: jersey });
    } else if (role === "head coach" || role === "assistant coach") {
      entry.staff.push({ display_name: `Coach ${name}`, role: role === "head coach" ? "Head Coach" : "Assistant Coach" });
    } else throw new Error(`Row ${i + 2}: unknown role "${get("role")}"`);
    teams.set(team, entry);
  });
  return [...teams.values()];
}

// ---------- Live TIMU results.php HTML (no JSON feed; server-rendered divs) ----------
// The page lists pool, court and set scores per match but no per-match time, so times are
// estimated from the tournament start: each repeat of a court starts a new round.
export type TimuParseOptions = { division: string; slotMinutes?: number; courtMap?: Record<string, string> | undefined; teamAliases?: Record<string, string> | undefined };
const strip = (s: string) => s.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();

export function parseTimuHtml(html: string, opts: TimuParseOptions): { games: TimuGame[] } {
  const date = html.match(/name='tdate' value='(\d{4}-\d{2}-\d{2})'/)?.[1] ?? html.match(/(\w+ \d{1,2}, \d{4})<br>/)?.[1];
  const iso = date && /^\d{4}/.test(date) ? date : date ? new Date(`${date} 12:00`).toISOString().slice(0, 10) : null;
  const start = html.match(/Start time:\s*(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (!iso || !start) throw new Error("TIMU page has no date or start time");
  const startMin = ((Number(start[1]) % 12) + (start[3]!.toLowerCase() === "pm" ? 12 : 0)) * 60 + Number(start[2]);
  const blocks = html.split(/<div id='(\d+)' class='wrapper'/).slice(1);
  const games: TimuGame[] = [];
  const seenCourts = new Set<string>();
  let round = 0;
  for (let i = 0; i < blocks.length; i += 2) {
    const id = blocks[i]!, b = blocks[i + 1]!;
    const pool = b.match(/>(Pool [A-Z0-9]+)/)?.[1] ?? "";
    const rawCourt = b.match(/Court:\s*([\w-]+)/)?.[1];
    const teams = [...b.matchAll(/class='away[^']*'[^>]*>([\s\S]*?)<\/div>/g)].map((m) => strip(m[1]!));
    const boxes = [...b.matchAll(/class='(?:home|away)-box[^']*'>([\s\S]*?)(?=<div class='(?:home|away)-box|$)/g)].map((m) =>
      [...m[1]!.replace(/<!--[\s\S]*?-->/g, "").matchAll(/class='set-block'[^>]*>([^<]*)</g)].map((x) => x[1]!.trim()));
    if (!rawCourt || teams.length < 2 || boxes.length < 2) continue;
    if (seenCourts.has(rawCourt)) { round++; seenCourts.clear(); }
    seenCourts.add(rawCourt);
    const [h, a] = boxes as [string[], string[]];
    const sets: [number, number][] = [];
    for (let s = 1; s < Math.min(h.length, a.length); s++) if (h[s] !== "" && a[s] !== "") sets.push([Number(h[s]), Number(a[s])]);
    const decided = sets.filter(([x, y]) => x > y).length >= 2 || sets.filter(([x, y]) => y > x).length >= 2;
    const m = startMin + round * (opts.slotMinutes ?? 60);
    games.push({
      match_no: `timu-${id}`, division: opts.division, pool, date: iso,
      time: `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`,
      court: opts.courtMap?.[rawCourt] ?? rawCourt,
      home: opts.teamAliases?.[teams[0]!] ?? teams[0]!, away: opts.teamAliases?.[teams[1]!] ?? teams[1]!,
      status: decided ? "final" : sets.length ? "live" : "scheduled", sets, time_estimated: true,
    });
  }
  if (!games.length) throw new Error("TIMU page had no matches");
  return { games };
}

// ---------- Shared time helpers (venue time is Toronto, never the device or server timezone) ----------
export const torontoDate = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto" }).format(new Date(iso));
const torontoClock = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "America/Toronto", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
// Moves a real start time onto another venue date, keeping the same Toronto clock time (used only for demo dates).
const onDate = (iso: string, date: string) => torontoTimestamp(`${date}T${torontoClock(iso)}`)!;

// ---------- MyTeam.click (JSON behind the schedule page; beach pairs) ----------
// Beach pairs are people, often minors: only initials ever leave the adapter ("E.Kent Elmido/J.Reyes" becomes "E.E. / J.R.").
export function pairInitials(name: string): string {
  const partners = name.split("/").map((p) => p.trim()).filter(Boolean);
  if (!partners.length) throw new Error("Empty pair name");
  return partners
    .map((p) => {
      const tagged = /^(\p{L})\.\s*(.+)$/u.exec(p);
      const first = tagged ? tagged[1]! : p[0]!;
      const rest = tagged ? tagged[2]! : p.split(/\s+/).slice(1).join(" ") || p;
      return `${first}.${rest.split(/\s+/).pop()![0]!}.`.toUpperCase();
    })
    .join(" / ");
}

export type MyteamSchedule = {
  success?: boolean;
  event: {
    timeFrames: { start: string }[];
    groups: { name: string; suffix?: string; teams: { _id: string; name: string }[] }[];
    matchList: { _id: number; type?: string; state?: number; courtNo: number; time: number; dayIndex?: number | null; teams?: { teamId?: string; scores?: number[] }[] }[];
  };
};
export type MyteamOptions = { scheduleId: string; division?: string | undefined; eventDate?: string | undefined; courtMap?: Record<string, string> | undefined };

export function mapMyteam(schedule: MyteamSchedule, opts: MyteamOptions): CanonicalMatch[] {
  const ev = schedule?.event;
  if (!ev || !Array.isArray(ev.matchList) || !Array.isArray(ev.groups) || !Array.isArray(ev.timeFrames)) throw new Error("MyTeam payload has no schedule");
  const teams = new Map<string, { name: string; division: string }>();
  const used = new Set<string>();
  for (const g of ev.groups) {
    const division = opts.division ?? `${g.name} ${g.suffix ?? ""}`.trim();
    for (const t of g.teams ?? []) {
      let name = pairInitials(t.name);
      for (let n = 2; used.has(name); n++) name = `${pairInitials(t.name)} (${n})`; // two pairs can share initials
      used.add(name);
      teams.set(t._id, { name, division });
    }
  }
  const out: CanonicalMatch[] = [];
  for (const m of ev.matchList) {
    const [a, b] = [m.teams?.[0], m.teams?.[1]];
    if (!a?.teamId || !b?.teamId) continue; // finals whose teams are not decided yet
    const home = teams.get(a.teamId);
    const away = teams.get(b.teamId);
    if (!home || !away) throw new Error(`Unknown MyTeam team in match ${m._id}`);
    const frame = ev.timeFrames[m.dayIndex ?? 0];
    if (!frame || !Number.isFinite(m.time)) throw new Error(`Incomplete MyTeam match ${m._id}`);
    const realStart = new Date(Date.parse(frame.start) + m.time * 60_000).toISOString();
    const sets: number[][] = [];
    const [sa, sb] = [a.scores ?? [], b.scores ?? []];
    for (let i = 0; i < Math.min(sa.length, sb.length); i++) if (Number.isFinite(sa[i]) && Number.isFinite(sb[i])) sets.push([sa[i]!, sb[i]!]);
    const home_sets = sets.filter(([h, w]) => h! > w!).length;
    const away_sets = sets.filter(([h, w]) => w! > h!).length;
    out.push({
      external_id: `myteam-${opts.scheduleId}-${m._id}`,
      division: home.division,
      pool: m.type === "F" ? "Finals" : "Pool play",
      date: opts.eventDate ?? torontoDate(realStart),
      start_at: opts.eventDate ? onDate(realStart, opts.eventDate) : realStart,
      court_label: opts.courtMap?.[String(m.courtNo)] ?? String(m.courtNo),
      home: home.name,
      away: away.name,
      status: m.state === 2 ? "final" : sets.length ? "live" : "scheduled",
      time_estimated: false,
      result: sets.length ? { home_sets, away_sets, set_scores: sets } : null,
    });
  }
  return out;
}

// ---------- AES (JSON behind the Court Sched page; one payload per day) ----------
// The court schedule carries the match, teams, court and absolute times. It has no set scores, only an "outcome recorded" flag.
export type AesCourtDay = {
  CourtSchedules: { Name: string; CourtMatches: { MatchId: number; Division?: { Name?: string }; FirstTeamText?: string; SecondTeamText?: string; ScheduledStartDateTime: number; HasOutcome?: boolean }[] }[];
};

export function mapAesSchedule(days: AesCourtDay[], opts: { onlyCourts?: string[] | undefined } = {}): CanonicalMatch[] {
  if (!Array.isArray(days) || days.some((d) => !Array.isArray(d?.CourtSchedules))) throw new Error("AES payload has no court schedules");
  const teamName = (text: string | undefined) => (text ?? "").replace(/\s*\(\d+\)\s*$/, "").trim(); // AES appends a team number
  const byId = new Map<string, CanonicalMatch>(); // the same match must never appear twice in one batch
  for (const day of days) {
    for (const court of day.CourtSchedules) {
      const label = /(\d+)/.exec(court.Name)?.[1] ?? court.Name.trim();
      if (opts.onlyCourts && !opts.onlyCourts.includes(label)) continue;
      for (const m of court.CourtMatches ?? []) {
        const home = teamName(m.FirstTeamText);
        const away = teamName(m.SecondTeamText);
        if (!home || !away) continue; // teams not assigned yet
        if (!Number.isFinite(m.MatchId) || !Number.isFinite(m.ScheduledStartDateTime)) throw new Error(`Incomplete AES match ${m.MatchId ?? "?"}`);
        const start_at = new Date(m.ScheduledStartDateTime).toISOString();
        byId.set(`aes${m.MatchId}`, {
          external_id: `aes${m.MatchId}`,
          division: m.Division?.Name ?? "",
          pool: null,
          date: torontoDate(start_at),
          start_at,
          court_label: label,
          home,
          away,
          status: m.HasOutcome ? "final" : "scheduled",
          time_estimated: false,
          result: null,
        });
      }
    }
  }
  return [...byId.values()];
}
