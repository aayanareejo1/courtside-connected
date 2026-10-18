import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { ASK_INTRO, ASK_SUGGESTIONS } from "@/lib/ask-courtside";
import { Button } from "@/components/ui/button";

// Home card: tapping a starter question opens /ask and sends it there.
export function AskCard() {
  return <section aria-labelledby="ask-title" className="space-y-3 rounded-lg border bg-card p-4">
    <h2 id="ask-title" className="flex items-center gap-2 text-2xl font-bold uppercase"><MessageCircle className="h-5 w-5" aria-hidden />Ask Courtside</h2>
    <p className="text-sm text-muted-foreground">{ASK_INTRO}</p>
    <ul aria-label="Suggested questions" className="flex flex-wrap gap-2">{ASK_SUGGESTIONS.map((s) =>
      <li key={s}><Button asChild variant="outline" className="h-auto min-h-11 whitespace-normal rounded-full text-left"><Link to="/ask" search={{ q: s }}>{s}</Link></Button></li>)}</ul>
    <Button asChild className="min-h-12 w-full"><Link to="/ask" search={{}}>Ask a question</Link></Button>
  </section>;
}
