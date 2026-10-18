import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";
import { matchSourceNotices, type MatchSource, type SourcedMatch } from "@/lib/source-status";

export function SourceBadges({ matches, sources = [], savedAt = null }: {
  matches: readonly SourcedMatch[]; sources?: readonly MatchSource[]; savedAt?: number | null;
}) {
  const [now, setNow] = useState(0);
  useEffect(() => { setNow(Date.now()); const id = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(id); }, []);
  const notices = matchSourceNotices(matches, sources, now, savedAt);
  if (!notices.length) return null;
  return <div aria-label={t.provenance.title} className="my-2 flex flex-wrap gap-x-4 gap-y-2">
    {notices.map(({ source, provenance, health, updatedAt }) => <div key={source?.id ?? "unknown"} className="min-w-0 text-xs">
      <p className="mb-1 break-words text-muted-foreground">{source?.name ?? t.provenance.unknown}</p>
      <span data-provenance={provenance} className="inline-block max-w-full rounded border bg-muted px-2 py-1 font-semibold text-foreground">{t.home.provenance[provenance]}</span>
      {(health === "failed" || health === "stale" || health === "never" || savedAt !== null) && <p className="mt-1 text-muted-foreground">
        {t.provenance.lastUpdated} {updatedAt ? <time dateTime={updatedAt}>{new Date(updatedAt).toLocaleString("en-CA", { timeZone: "America/Toronto", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · {t.schedule.timezone}</time> : t.provenance.timeUnknown}
        {health === "failed" && <span className="block text-destructive">{t.home.failed}</span>}
        {health === "stale" && <span className="block text-foreground">{t.home.stale}</span>}
      </p>}
    </div>)}
  </div>;
}
