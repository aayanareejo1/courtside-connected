import { buildFacts, MAX_HISTORY, type AskContent, type AskData, type AskLink, type AskTurn } from "@/lib/ask-courtside";

export type VoiceMessage = { role: string; content: unknown };
export type EventLookup = { facts: string; links: AskLink[] };

// Transcript deltas are fragments, not separate questions. Keep adjacent
// speaker fragments together before the model and shared retrieval see them.
export function appendVoiceText<T extends VoiceMessage>(messages: T[], role: "user" | "assistant", text: string) {
  const last = messages[messages.length - 1];
  if (last?.role === role && typeof last.content === "string") last.content += text;
  else messages.push({ role, content: text } as T);
}

export function voiceHistory(messages: readonly VoiceMessage[]): AskTurn[] {
  const turns: AskTurn[] = [];
  for (const message of messages) {
    if (typeof message.content !== "string") continue;
    if (message.role === "user") turns.push({ question: message.content, answer: "" });
    else if (message.role === "assistant") {
      const last = turns[turns.length - 1];
      if (last) last.answer += message.content;
    }
  }
  return turns.slice(-MAX_HISTORY);
}

export function buildVoiceFacts(data: AskData, content: AskContent, question: string, now: number, history: readonly AskTurn[]): EventLookup {
  const facts = buildFacts(data, content, { question, follows: [], history }, now);
  // Do not cut off the LINKS section at an arbitrary character boundary.
  return { facts: facts.text, links: facts.links };
}

export function readVoiceLinks(value: unknown): AskLink[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const { title, url, category, useFor } = entry as Record<string, unknown>;
    if (typeof title !== "string" || typeof url !== "string") return [];
    try {
      const parsed = new URL(url);
      if (!["https:", "http:"].includes(parsed.protocol) || parsed.username || parsed.password) return [];
      return [{ title, url, category: typeof category === "string" ? category : "other", useFor: typeof useFor === "string" ? useFor : "" }];
    } catch { return []; }
  });
}