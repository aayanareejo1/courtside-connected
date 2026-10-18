import { Car, Hotel, Video, Utensils, Gift, Info, ExternalLink } from "lucide-react";
import { safeExternalUrl } from "@/lib/content-rules";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

type InfoItem = { id: string; category: string; title: string; description: string | null; url: string | null };
export function EventInfoSections({ items }: { items: InfoItem[] }) {
  const icons: Record<string, typeof Info> = { parking: Car, hotel: Hotel, streaming: Video, food: Utensils, raffle: Gift };
  return <>{Array.from(new Set(items.map((item) => item.category))).map((category) => {
    const Icon = icons[category] ?? Info;
    const label = t.info.categories[category as keyof typeof t.info.categories] ?? t.info.categories.other;
    return <section key={category} className="space-y-3"><h2 className="flex items-center gap-2 text-2xl font-bold uppercase"><Icon className="h-5 w-5 text-primary" aria-hidden />{label}</h2>
      <ul className="divide-y">{items.filter((item) => item.category === category).map((item) => {
        const url = safeExternalUrl(item.url);
        return <li key={item.id} className="py-3"><h3 className="font-sans text-base font-semibold">{item.title}</h3>{item.description && <p className="mt-1 text-sm text-muted-foreground">{item.description.replace(/\u2014/g, "-")}</p>}{url && <Button asChild variant="link" className="tap mt-1 h-auto justify-start whitespace-normal p-0"><a href={url} target="_blank" rel="noopener noreferrer" aria-label={`${t.info.open}: ${item.title}`}>{t.info.open}<ExternalLink aria-hidden /></a></Button>}</li>;
      })}</ul>
    </section>;
  })}</>;
}
