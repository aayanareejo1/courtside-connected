import { MessageCircle } from "lucide-react";
import { ASK_INTRO, ASK_SUGGESTIONS } from "@/lib/ask-courtside";
import { openAsk } from "@/components/AskWidget";
import { Button } from "@/components/ui/button";

// Home card: tapping a starter question opens the chat in the bottom right corner and sends it.
export function AskCard() {
  return <section aria-labelledby="ask-title" className="space-y-3 rounded-lg border bg-card p-4">
    <h2 id="ask-title" className="flex items-center gap-2 text-2xl font-bold uppercase"><MessageCircle className="h-5 w-5" aria-hidden />Ask Courtside</h2>
    <p className="text-sm text-muted-foreground">{ASK_INTRO}</p>
    <ul aria-label="Suggested questions" className="flex flex-wrap gap-2">{ASK_SUGGESTIONS.map((s) =>
      <li key={s}><Button type="button" variant="outline" className="h-auto min-h-11 whitespace-normal rounded-full text-left" onClick={() => openAsk(s)}>{s}</Button></li>)}</ul>
    <Button type="button" className="min-h-12 w-full" onClick={() => openAsk()}>Ask a question</Button>
  </section>;
}
