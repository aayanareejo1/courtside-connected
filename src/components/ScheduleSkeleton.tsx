import { t } from "@/lib/i18n";
export function ScheduleSkeleton() {
  return <div role="status" aria-label={t.search.loading} className="min-h-96 space-y-6">
    <span className="sr-only">{t.search.loading}</span>
    <div aria-hidden="true" className="space-y-3 motion-safe:animate-pulse">
      <div className="h-4 w-32 rounded bg-muted" /><div className="h-10 w-3/4 rounded bg-muted" />
      <div className="h-12 w-full rounded bg-muted" />
      <ul className="space-y-2">{[0, 1, 2, 3].map((row) => <li key={row} className="min-h-32 space-y-3 rounded-lg bg-card p-3">
        <div className="h-4 w-1/2 rounded bg-muted" /><div className="h-6 w-3/4 rounded bg-muted" />
        <div className="h-11 w-32 rounded bg-muted" />
      </li>)}</ul>
    </div>
  </div>;
}
