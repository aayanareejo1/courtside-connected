import { Link } from "@tanstack/react-router";
import { ExternalLink, Gift, MapPin, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { safeExternalUrl } from "@/lib/content-rules";
import { t } from "@/lib/i18n";

export type SponsorSlot = { id: string; placement: string; headline: string | null; offer_text: string | null; court_id: string | null; sponsors: { id: string; name: string; logo_path: string | null; url: string | null } | null; courts: { id: string; label: string } | null };

export function SponsorCard({ slot }: { slot: SponsorSlot }) {
  const sponsor = slot.sponsors;
  if (!sponsor) return null;
  const url = safeExternalUrl(sponsor.url);
  const logo = safeExternalUrl(sponsor.logo_path);
  const offer = slot.placement === "offer" || slot.placement === "map_pin";
  const Icon = offer ? Gift : Trophy;
  return <article id={`slot-${slot.id}`} className="scroll-mt-20 overflow-hidden rounded-lg border bg-card">
    <div className={`flex items-center gap-3 border-b p-4 ${offer ? "bg-accent/15" : "bg-secondary"}`}>
      {logo ? <img src={logo} alt={sponsor.name} className="h-12 w-12 object-contain" /> : <Icon className={`h-8 w-8 shrink-0 ${offer ? "text-accent-foreground" : "text-primary"}`} aria-hidden />}
      <h2 className="min-w-0 break-words text-2xl font-bold uppercase">{sponsor.name}</h2>
    </div>
    <div className="space-y-3 p-4">{slot.headline && <h3 className="font-sans text-base font-semibold">{slot.headline}</h3>}{slot.offer_text && <p className="text-sm text-muted-foreground">{slot.offer_text}</p>}
      {slot.courts && <Button asChild variant="link" className="tap h-auto justify-start whitespace-normal p-0"><Link to="/courts/$courtId" params={{ courtId: slot.courts.id }}><MapPin aria-hidden />{t.sponsors.near} {t.map.court} {slot.courts.label}</Link></Button>}
      {url && <div><Button asChild variant="outline" className="tap"><a href={url} target="_blank" rel="noopener noreferrer">{t.sponsors.visit}<ExternalLink aria-hidden /></a></Button></div>}
    </div>
  </article>;
}