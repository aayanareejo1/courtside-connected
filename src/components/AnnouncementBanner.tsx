import { t } from "@/lib/i18n";

export type Announcement = { id: string; title: string; body: string; severity: string; created_at?: string | null };

const posted = (value?: string | null) => {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time)
    ? new Date(time).toLocaleString("en-CA", { timeZone: "America/Toronto", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : null;
};

// Plain, person-written list: bold title, one line of body, small grey time, thin dividers.
export function AnnouncementBanner({ announcements }: { announcements: Announcement[] }) {
  if (!announcements.length) return null;
  return <section aria-label={t.announcements.title}>
    <h2 className="text-2xl font-bold uppercase">{t.announcements.title}</h2>
    <ul className="divide-y">{announcements.map((a) => {
      const time = posted(a.created_at);
      return <li key={a.id} className="py-3">
        {a.severity === "urgent" && <p className="text-xs font-bold uppercase tracking-wide text-accent">{t.announcements.urgent}</p>}
        <h3 className="font-sans text-base font-bold">{a.title}</h3>
        {a.body && <p className="mt-0.5 truncate text-sm text-muted-foreground">{a.body}</p>}
        {time && <p className="mt-0.5 text-xs text-muted-foreground"><time dateTime={a.created_at ?? undefined}>{time}</time></p>}
      </li>;
    })}</ul>
  </section>;
}
