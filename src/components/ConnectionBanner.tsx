import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { WifiOff } from "lucide-react";
import { t } from "@/lib/i18n";
import { CACHE_KEY, CONTENT_CACHE_KEY, VENUE_CACHE_KEY, deviceStorage, readCache } from "@/lib/offline-cache";

const clock = (ms: number) => new Date(ms).toLocaleString("en-CA", { timeZone: "America/Toronto", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
export function ConnectionBanner() {
  const qc = useQueryClient();
  const [state, setState] = useState<{ online: boolean; savedAt: number | null; fallback: boolean }>({ online: true, savedAt: null, fallback: false });
  useEffect(() => {
    const update = () => {
      const queries = qc.getQueryCache().getAll().filter((q) => ["event-directory", "event-content", "venue-map"].includes(String(q.queryKey[0])));
      const fallbackTimes = queries.flatMap((q) => {
        const data = q.state.data as { offlineSavedAt?: number | null } | undefined;
        return typeof data?.offlineSavedAt === "number" ? [data.offlineSavedAt] : [];
      });
      const cachedTimes = [CACHE_KEY, CONTENT_CACHE_KEY, VENUE_CACHE_KEY].flatMap((key) => {
        const cached = readCache(deviceStorage(), key);
        return cached ? [cached.savedAt] : [];
      });
      // Oldest available save is conservative when independently loaded datasets differ.
      const times = fallbackTimes.length ? fallbackTimes : cachedTimes;
      const next = { online: navigator.onLine, savedAt: times.length ? Math.min(...times) : null, fallback: fallbackTimes.length > 0 };
      setState((previous) => previous.online === next.online && previous.savedAt === next.savedAt && previous.fallback === next.fallback ? previous : next);
    };
    update();
    const unsubscribe = qc.getQueryCache().subscribe(update);
    window.addEventListener("online", update); window.addEventListener("offline", update); window.addEventListener("storage", update);
    return () => { unsubscribe(); window.removeEventListener("online", update); window.removeEventListener("offline", update); window.removeEventListener("storage", update); };
  }, [qc]);
  const visible = !state.online || state.fallback;
  const text = state.savedAt !== null
    ? `${state.online ? t.offline.saved : t.offline.banner} ${clock(state.savedAt)} · ${t.schedule.timezone}${state.online ? ` — ${t.offline.retrying}` : ""}`
    : t.offline.noSaved;
  return <div aria-live="polite">
    {visible && <div role="status" className="flex min-h-16 items-center gap-2 bg-warning px-4 py-2 text-sm font-semibold text-warning-foreground">
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" /><span>{text}</span>
    </div>}
  </div>;
}
