import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { WifiOff } from "lucide-react";
import { eventDataQuery } from "@/lib/event-data";
import { t } from "@/lib/i18n";
import { readCache } from "@/lib/offline-cache";

const clock = (ms: number) => new Date(ms).toLocaleTimeString("en-CA", { timeZone: "America/Toronto", hour: "numeric", minute: "2-digit" });

// Tells spectators when they are seeing saved data rather than the latest.
export function ConnectionBanner() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  const { data, dataUpdatedAt } = useQuery({ ...eventDataQuery, enabled: false });
  const savedAt = data?.offlineSavedAt ?? null;
  if (online && !savedAt) return null;
  const shownAt = savedAt ?? (dataUpdatedAt || readCache(window.localStorage)?.savedAt || null);
  const text = !online ? `${t.offline.banner}${shownAt ? ` ${clock(shownAt)}` : ""}` : `${t.offline.saved} ${clock(savedAt!)} — ${t.offline.retrying}`;
  return (
    <div role="status" className="flex items-center gap-2 bg-warning px-4 py-2 text-sm font-semibold text-warning-foreground">
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
      <span>{text}</span>
    </div>
  );
}
