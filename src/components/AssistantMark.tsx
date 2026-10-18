import { MessageCircle } from "lucide-react";

export function AssistantMark({ small = false }: { small?: boolean }) {
  return <span aria-hidden className={`inline-flex shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary ${small ? "h-8 w-8" : "h-12 w-12"}`}><MessageCircle className={small ? "h-4 w-4" : "h-6 w-6"} /></span>;
}