import { AlertTriangle, Megaphone } from "lucide-react";
import { t } from "@/lib/i18n";

export function AnnouncementBanner({ announcements }: { announcements: { id: string; title: string; body: string; severity: string }[] }) {
  if (!announcements.length) return null;
  return <section aria-label={t.home.announcements} className="space-y-2">{announcements.map((a) => {
    const urgent = a.severity === "urgent";
    const important = a.severity === "important";
    const Icon = urgent || important ? AlertTriangle : Megaphone;
    return <article key={a.id} className={`border-l-4 p-3 ${urgent ? "border-destructive bg-destructive/10" : important ? "border-warning bg-warning/20" : "border-primary bg-secondary"}`}>
      <p className={`mb-1 flex items-center gap-2 text-xs font-semibold uppercase ${urgent ? "text-destructive" : important ? "text-warning-foreground" : "text-primary"}`}><Icon className="h-4 w-4" aria-hidden />{urgent ? t.announcements.urgent : important ? t.announcements.important : t.announcements.info}</p>
      <h2 className="font-sans text-base font-semibold">{a.title}</h2><p className="mt-1 text-sm text-muted-foreground">{a.body}</p>
    </article>;
  })}</section>;
}