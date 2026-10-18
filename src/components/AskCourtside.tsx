// Ask OVAchamps chat. Questions go only to POST /api/public/ask and live in component state for this visit.
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, AudioLines, ExternalLink, Send } from "lucide-react";
import { ASK_INTRO, ASK_SUGGESTIONS, MAX_HISTORY, MAX_QUESTION, type AskTurn } from "@/lib/ask-courtside";
import { useFollows } from "@/lib/follows";
import { appNow } from "@/lib/clock";
import { Button } from "@/components/ui/button";
import { AssistantMark } from "@/components/AssistantMark";

export type AskLinkOut = { title: string; url: string };
export type Exchange = { id: number; question: string; answer?: string; links?: AskLinkOut[]; mode?: "ai" | "basic"; error?: string };
export const MAX_EXCHANGES = 5;

export function errorMessage(status: number): string {
  if (status === 429) return "Please wait a minute and try again.";
  if (status === 400) return "Please ask a shorter question (300 characters or fewer).";
  if (status === 503) return "Ask OVAchamps is busy right now. Please try again shortly.";
  return "Something went wrong. Please check your connection and try again.";
}

const isSafe = (url: string) => /^https?:\/\//i.test(url);

// Turns [label](https://…) into real links; everything else stays plain text.
export function renderAnswer(text: string): ReactNode[] {
  text = text.replace(/\u2014/g, "-");
  const out: ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0; let m: RegExpExecArray | null; let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<Fragment key={i++}>{text.slice(last, m.index)}</Fragment>);
    const [, label, url] = m;
    out.push(url && isSafe(url) ? <a key={i++} href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-4">{label}<span className="sr-only"> (opens in a new tab)</span></a> : <Fragment key={i++}>{label}</Fragment>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(<Fragment key={i++}>{text.slice(last)}</Fragment>);
  return out;
}

export function AskCourtside({ initialQuestion, trigger, onVoice, onHistory }: { initialQuestion?: string | undefined; trigger?: { q: string; n: number } | undefined; onVoice?: (() => void) | undefined; onHistory?: ((history: AskTurn[]) => void) | undefined }) {
  const { follows } = useFollows();
  const [text, setText] = useState("");
  const [items, setItems] = useState<Exchange[]>([]);
  const [busy, setBusy] = useState(false);
  const nextId = useRef(1);
  const itemsRef = useRef<Exchange[]>([]);
  itemsRef.current = items;
  const asked = useRef(false);
  const latest = useRef<HTMLLIElement>(null);

  useEffect(() => { latest.current?.scrollIntoView?.({ behavior: "instant", block: "nearest" }); }, [items]);
  useEffect(() => { onHistory?.(items.flatMap((item) => typeof item.answer === "string" ? [{ question: item.question, answer: item.answer }] : []).slice(-MAX_HISTORY)); }, [items, onHistory]);

  async function ask(raw: string) {
    const question = raw.trim().slice(0, MAX_QUESTION);
    if (!question || busy) return;
    // The last answered exchanges go along so a follow up knows who it is about.
    const history = itemsRef.current.flatMap((x) => typeof x.answer === "string" ? [{ question: x.question, answer: x.answer }] : []).slice(-MAX_HISTORY);
    const id = nextId.current++;
    setItems((list) => [...list, { id, question }].slice(-MAX_EXCHANGES));
    setText(""); setBusy(true);
    let patch: Partial<Exchange>;
    try {
      const res = await fetch("/api/public/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question, follows, now: appNow(), history }) });
      const body = (await res.json().catch(() => ({}))) as { answer?: string; links?: AskLinkOut[]; mode?: "ai" | "basic"; error?: string };
      patch = res.ok && typeof body.answer === "string" ? { answer: body.answer, links: (body.links ?? []).filter((l) => isSafe(l.url)), mode: body.mode === "basic" ? "basic" : "ai" } : { error: errorMessage(res.status) };
    } catch { patch = { error: errorMessage(0) }; }
    setItems((list) => list.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    setBusy(false);
  }

  useEffect(() => { if (trigger?.q) void ask(trigger.q); }, [trigger?.n]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (initialQuestion && !asked.current) { asked.current = true; void ask(initialQuestion); } }, [initialQuestion]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div className="flex min-h-0 flex-1 flex-col">
    <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 py-5 sm:px-5">
    <div className="space-y-3"><AssistantMark /><p className="text-sm leading-relaxed text-muted-foreground">{ASK_INTRO}</p></div>
    <ul aria-label="Suggested questions" className="grid gap-2">{ASK_SUGGESTIONS.map((s) =>
      <li key={s}><Button type="button" variant="outline" className="h-auto min-h-12 w-full justify-between gap-3 whitespace-normal rounded-lg bg-background/40 px-3 py-3 text-left text-sm font-medium" disabled={busy} onClick={() => void ask(s)}><span className="min-w-0 break-words">{s}</span><ArrowUpRight className="h-4 w-4 shrink-0 text-primary" aria-hidden /></Button></li>)}</ul>
    <ol aria-label="Conversation" aria-live="polite" aria-relevant="additions text" className="space-y-6">{items.map((x, index) => <li key={x.id} ref={index === items.length - 1 ? latest : undefined} className="space-y-4">
      <div className="ml-auto max-w-[90%] space-y-1"><p className="text-right text-xs text-muted-foreground" aria-hidden>You</p><p className="w-fit break-words rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-foreground"><span className="sr-only">You asked: </span>{x.question}</p></div>
      <div className="flex items-center gap-2"><AssistantMark small /><span className="text-xs font-semibold text-muted-foreground" aria-hidden>OVAchamps</span></div>
      {x.error ? <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-destructive">{x.error}</p>
        : x.answer === undefined ? <p role="status" className="flex w-fit items-center gap-1.5 px-1 py-2" aria-label="Ask OVAchamps is typing"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary motion-reduce:animate-none" /><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary motion-reduce:animate-none [animation-delay:150ms]" /><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary motion-reduce:animate-none [animation-delay:300ms]" /></p>
        : <div className="space-y-4"><p className="whitespace-pre-line break-words text-sm leading-7"><span className="sr-only">Ask OVAchamps answered: </span>{renderAnswer(x.answer)}</p>
          {x.mode === "basic" && <p className="text-xs font-semibold uppercase text-muted-foreground">Basic answer</p>}
          {x.links && x.links.length > 0 && <ul className="space-y-2">{x.links.map((l) => <li key={l.url}><Button asChild variant="secondary" className="h-auto min-h-12 w-full justify-between whitespace-normal"><a href={l.url} target="_blank" rel="noopener noreferrer">{l.title}<ExternalLink className="h-4 w-4 shrink-0" aria-hidden /><span className="sr-only"> (opens in a new tab)</span></a></Button></li>)}</ul>}
        </div>}
    </li>)}</ol>
    </div>
    <form className="shrink-0 space-y-2 border-t bg-card px-4 pb-3 pt-4 sm:px-5" onSubmit={(e) => { e.preventDefault(); void ask(text); }}>
      <label htmlFor="ask-input" className="sr-only">Your question</label>
      <div className="flex items-end gap-2 rounded-lg border border-input bg-background p-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-ring">
        <textarea id="ask-input" value={text} maxLength={MAX_QUESTION} rows={2} onChange={(e) => setText(e.target.value.slice(0, MAX_QUESTION))}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void ask(text); } }}
          aria-describedby="ask-count" className="min-h-12 min-w-0 flex-1 resize-none bg-transparent px-1 py-2 text-base focus-visible:outline-none" placeholder="What can I help you find?" />
        {onVoice && <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={onVoice} aria-label="Talk with voice"><AudioLines className="h-5 w-5" aria-hidden /></Button>}
        <Button type="submit" size="icon" className="h-11 w-11 shrink-0" disabled={busy || !text.trim()} aria-label="Send question"><Send className="h-4 w-4" aria-hidden /></Button>
      </div>
      <p id="ask-count" className="text-right text-xs text-muted-foreground">{text.length}/{MAX_QUESTION}</p>
    </form>
  </div>;
}
