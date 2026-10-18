// Floating Ask Courtside chat, bottom right on every screen. The conversation stays while the panel is closed.
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, X } from "lucide-react";
import { AskCourtside } from "@/components/AskCourtside";

const EVENT = "courtside:ask";
// Anything in the app can open the chat, optionally with a question: openAsk("Where is court 9?").
export const openAsk = (q = "") => window.dispatchEvent(new CustomEvent(EVENT, { detail: { q } }));

export function AskWidget() {
  const [open, setOpen] = useState(false);
  const [trigger, setTrigger] = useState<{ q: string; n: number } | undefined>();
  const panel = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onAsk = (e: Event) => {
      setOpen(true);
      const q = (e as CustomEvent<{ q?: string }>).detail?.q ?? "";
      if (q) setTrigger((prev) => ({ q, n: (prev?.n ?? 0) + 1 }));
    };
    window.addEventListener(EVENT, onAsk);
    return () => window.removeEventListener(EVENT, onAsk);
  }, []);

  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLElement>("textarea")?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); button.current?.focus(); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return <>
    <div ref={panel} id="ask-panel" role="dialog" aria-label="Ask Courtside" hidden={!open}
      className="fixed bottom-36 right-4 z-40 flex max-h-[min(70dvh,34rem)] w-[min(calc(100vw-2rem),24rem)] flex-col overflow-hidden rounded-lg border bg-card shadow-xl">
      <div className="flex items-center justify-between border-b bg-ink px-4 py-2 text-ink-foreground">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold uppercase"><MessageCircle className="h-5 w-5" aria-hidden />Ask Courtside</h2>
        <Button type="button" onClick={() => { setOpen(false); button.current?.focus(); }} aria-label="Close Ask Courtside" className="tap inline-flex h-11 w-11 items-center justify-center rounded-md"><X className="h-5 w-5" aria-hidden /></Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3"><AskCourtside trigger={trigger} /></div>
    </div>
    <Button ref={button} type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="ask-panel"
      className="tap fixed bottom-20 right-4 z-40 inline-flex h-14 items-center gap-2 rounded-lg bg-primary px-5 font-semibold text-primary-foreground shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
      {open ? <X className="h-6 w-6" aria-hidden /> : <MessageCircle className="h-6 w-6" aria-hidden />}<span>{open ? "Close" : "Ask"}</span>
    </Button>
  </>;
}
