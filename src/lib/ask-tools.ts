// Ask Courtside as an agent: the model decides what to look up and when to ask the fan a question.
// Each tool reads the same canonical event data and returns plain text. No tool can write anything or reach the web.
import type { Follow } from "@/lib/follows";
import { buildFacts, buildLinks, matchPlayers, parseQuantity, SYSTEM_PROMPT, sanitizeAnswer, type AskContent, type AskData, type AskLink, type AskTurn } from "@/lib/ask-courtside";
import { SPONSOR_FACTS } from "@/lib/ask-knowledge";
import { eventDateLabel, eventTime } from "@/lib/schedule";
import { t } from "@/lib/i18n";

export const TOOL_DEFS = [
  { name: "get_followed", description: "The players and teams this fan follows on this device. Call first when the fan says 'my son', 'my team' or 'my game' without a name.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "find_players", description: "Find players by first name, optionally with last initial, for example 'Aayan' or 'Aayan A'. Returns player_id, team_id, team and division.", input_schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"], additionalProperties: false } },
  { name: "get_profile", description: "Full summary of one player's team or one team: division, club, coaches, record and every match with court, hall, result or arrival time. Give player_id or team_id.", input_schema: { type: "object", properties: { player_id: { type: "string" }, team_id: { type: "string" } }, additionalProperties: false } },
  { name: "get_matches", description: "Matches for a day, for the whole event or one team. day is today, tomorrow or all. team_id is optional.", input_schema: { type: "object", properties: { day: { type: "string", enum: ["today", "tomorrow", "all"] }, team_id: { type: "string" } }, required: ["day"], additionalProperties: false } },
  { name: "get_links", description: "Official links with what each is for: tickets, hotels, merchandise, 50/50, schedules and results, sponsorship, rules, social, directions. Pass quantity when the fan wants a number of tickets.", input_schema: { type: "object", properties: { category: { type: "string" }, quantity: { type: "integer", minimum: 1, maximum: 20 } }, additionalProperties: false } },
  { name: "get_event_info", description: "About the event, venue address, announcements, sponsor slots and the sponsorship and media contact steps.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
] as const;

export type ToolContext = { data: AskData; content: AskContent; follows: Follow[]; now: number; links: Map<string, AskLink> };
const str = (v: unknown) => (typeof v === "string" ? v.slice(0, 80) : "");

export function runTool(name: string, input: unknown, ctx: ToolContext): string {
  const args = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
  const { data, content, follows, now } = ctx;
  const team = (id: string) => data.teams.find((x) => x.id === id);
  const facts = (focus: { playerIds: string[]; teamIds: string[]; day?: "today" | "tomorrow" | null }, question = "details") => buildFacts(data, content, { question, follows, focus }, now);
  switch (name) {
    case "get_followed": {
      const rows = follows.flatMap((f) => {
        if (f.type === "player") { const p = data.players.find((x) => x.id === f.id); return p ? [`player ${p.display_name} | player_id ${p.id} | team ${team(p.team_id)?.name ?? "unknown"} | team_id ${p.team_id}`] : []; }
        const tm = team(f.id);
        return tm ? [`team ${tm.name} | team_id ${tm.id}`] : [];
      });
      return rows.join("\n") || "Nothing is followed on this device.";
    }
    case "find_players": {
      const found = matchPlayers(str(args["name"]), data.players);
      return found.length ? found.map((p) => `${p.display_name}${p.jersey_number != null ? ` #${p.jersey_number}` : ""} | player_id ${p.id} | team_id ${p.team_id} | team ${team(p.team_id)?.name ?? "unknown"} | division ${team(p.team_id)?.divisions?.name ?? "unknown"}`).join("\n") : "No player with that name.";
    }
    case "get_profile": {
      const pid = str(args["player_id"]); const tid = str(args["team_id"]);
      const player = data.players.find((p) => p.id === pid);
      const teamId = player?.team_id ?? (team(tid) ? tid : "");
      if (!teamId) return "Unknown player or team.";
      const f = facts({ playerIds: player ? [player.id] : [], teamIds: player ? [] : [teamId] });
      const p = f.profiles[0];
      return p ? [p.title, ...p.details, ...p.matches, f.venueLine ? `Venue: ${f.venueLine}.` : "", f.sourceLabel ? `Data: ${f.sourceLabel}.` : ""].filter(Boolean).join("\n") : "No profile available.";
    }
    case "get_matches": {
      const day = args["day"] === "tomorrow" ? "tomorrow" : args["day"] === "today" ? "today" : null;
      const tid = str(args["team_id"]);
      const f = facts({ playerIds: [], teamIds: team(tid) ? [tid] : [], day }, "games");
      const lines = day ? f.dayLines : tid ? f.matchLines : f.nextLines;
      return (lines.slice(0, 20).join("\n") || (day ? `No matches ${day}.` : "No matches found.")) + `\n(be at the court by is 15 minutes before start; NOW is ${eventDateLabel(new Date(now).toISOString())} ${eventTime(new Date(now))})`;
    }
    case "get_links": {
      const qty = typeof args["quantity"] === "number" ? Math.round(args["quantity"]) : null;
      const cat = str(args["category"]).toLowerCase();
      const all = buildLinks(content, qty && qty >= 1 && qty <= 20 ? qty : null);
      const rows = (cat ? all.filter((l) => l.category === cat) : all).slice(0, 20);
      for (const l of rows) ctx.links.set(l.url, l);
      return rows.map((l) => `[${l.category}] ${l.title} | ${l.url} | ${l.useFor}`).join("\n") || "No links in that category.";
    }
    case "get_event_info": {
      const f = facts({ playerIds: [], teamIds: [] });
      for (const l of f.links.filter((x) => x.category === "directions" || x.category === "sponsor")) ctx.links.set(l.url, l);
      return [
        `EVENT: ${content.event?.name ?? "event"}${f.venueLine ? ` at ${f.venueLine}` : ""}`,
        `ABOUT: ${t.info.aboutText}`,
        `ANNOUNCEMENTS:\n${content.announcements.slice(0, 5).map((a) => `${a.title}: ${a.body}`).join("\n") || "none"}`,
        `SPONSOR SLOTS:\n${content.slots.map((s) => `${s.headline ?? ""}: ${s.offer_text ?? ""}${s.sponsors ? ` (${s.sponsors.name})` : ""}`).join("\n") || "none"}`,
        `SPONSOR AND MEDIA FACTS:\n${SPONSOR_FACTS.join("\n")}`,
        `LINKS: ${f.links.filter((x) => x.category === "directions" || x.category === "sponsor").map((l) => `${l.title} | ${l.url}`).join("; ")}`,
      ].join("\n");
    }
    default: return "Unknown tool.";
  }
}

type Block = { type: string; text?: string; id?: string; name?: string; input?: unknown };
export type ModelReply = { content: Block[]; stop_reason?: string };
export type ModelMessage = { role: "user" | "assistant"; content: string | unknown[] };
export type CallModel = (system: string, messages: ModelMessage[], tools: readonly unknown[]) => Promise<ModelReply>;

// Runs the model, answering its tool calls, until it writes an answer. At most MAX_ROUNDS model calls.
export const MAX_ROUNDS = 5;
export async function runAgent(opts: { callModel: CallModel; question: string; history: readonly AskTurn[]; ctx: Omit<ToolContext, "links"> }): Promise<{ answer: string; links: { title: string; url: string }[] } | null> {
  const ctx: ToolContext = { ...opts.ctx, links: new Map() };
  const system = `${SYSTEM_PROMPT}\n\nNOW: ${eventDateLabel(new Date(opts.ctx.now).toISOString())} ${eventTime(new Date(opts.ctx.now))} Toronto time.`;
  const messages: ModelMessage[] = [...opts.history.flatMap((h): ModelMessage[] => [{ role: "user", content: h.question }, { role: "assistant", content: h.answer }]), { role: "user", content: opts.question }];
  const qty = parseQuantity(opts.question);
  for (const l of buildLinks(opts.ctx.content, qty)) if (l.category === "directions") ctx.links.set(l.url, l);
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const reply = await opts.callModel(system, messages, TOOL_DEFS);
    const calls = reply.content.filter((b) => b.type === "tool_use" && b.id && b.name);
    if (calls.length) {
      messages.push({ role: "assistant", content: reply.content });
      messages.push({ role: "user", content: calls.map((c) => ({ type: "tool_result", tool_use_id: c.id, content: runTool(c.name!, c.input, ctx) })) });
      continue;
    }
    const text = reply.content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n").trim();
    if (!text) return null;
    return sanitizeAnswer(text, [...ctx.links.values()], reply.stop_reason === "max_tokens");
  }
  return null;
}
