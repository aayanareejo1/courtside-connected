// Header-launched Ask OVAchamps. Conversation stays in memory while the panel is closed.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { MessageCircle, X } from "lucide-react";
import { AskCourtside } from "@/components/AskCourtside";
import { AssistantMark } from "@/components/AssistantMark";

const EVENT = "courtside:ask";
// Anything in the app can open the chat, optionally with a question: openAsk("Where is court 9?").
export const openAsk = (q = "") => window.dispatchEvent(new CustomEvent(EVENT, { detail: { q } }));

export function AskWidget() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [trigger, setTrigger] = useState<{ q: string; n: number } | undefined>();
  const panel = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => { setMounted(true); }, []);

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
    {mounted && createPortal(<div ref={panel} id="ask-panel" role="dialog" aria-label="Ask OVAchamps" hidden={!open}
      className="fixed bottom-20 right-2 top-20 z-40 flex w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-lg border bg-card shadow-xl sm:bottom-24 sm:right-5 sm:top-auto sm:h-[min(76dvh,44rem)] sm:w-[26rem]">
      <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-3"><AssistantMark small /><div className="min-w-0"><h2 className="truncate text-base font-semibold">Ask OVAchamps</h2><p className="text-xs text-muted-foreground">Your event companion</p></div></div>
        <Button type="button" variant="ghost" size="icon" onClick={() => { setOpen(false); button.current?.focus(); }} aria-label="Close Ask OVAchamps" className="h-11 w-11 shrink-0"><X className="h-5 w-5" aria-hidden /></Button>
      </div>
      <AskCourtside trigger={trigger} />
    </div>, document.body)}
    <Button ref={button} type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="ask-panel"
      className="tap inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-3 font-semibold text-primary-foreground shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
      {open ? <X className="h-6 w-6" aria-hidden /> : <MessageCircle className="h-6 w-6" aria-hidden />}<span>{open ? "Close" : "Ask"}</span>
    </Button>
  </>;
}
