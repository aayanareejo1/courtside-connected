import { useEffect, useState } from "react";
import { useQueryClient, useIsFetching } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { t } from "@/lib/i18n";

export const updatedLabel = (ms: number, now: number) => {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  return s < 10 ? t.live.justNow : s < 60 ? `${t.live.updated} ${s}${t.live.sec}` : `${t.live.updated} ${Math.floor(s / 60)}${t.live.min}`;
};

// Small "updated" note so spectators know scores refresh on their own.
export function LiveUpdated({ queryKey }: { queryKey: readonly unknown[] }) {
  const qc = useQueryClient();
  const fetching = useIsFetching({ queryKey }) > 0;
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const id = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(id); }, []);
  const at = qc.getQueryState(queryKey)?.dataUpdatedAt;
  if (!now || !at) return null;
  return (
    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <RefreshCw className={`h-3.5 w-3.5 ${fetching ? "motion-safe:animate-spin" : ""}`} aria-hidden />
      <span>{fetching ? t.live.refreshing : updatedLabel(at, now)} · {t.live.auto}</span>
    </p>
  );
}
