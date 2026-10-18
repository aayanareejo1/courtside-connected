import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { activeAnnouncements } from "@/lib/content-rules";
import { CONTENT_CACHE_KEY, deviceStorage, savedData, withDeviceCache } from "@/lib/offline-cache";

async function loadEventContent() {
  const { data: event, error } = await supabase.from("events")
    .select("id,name,starts_on,ends_on,registration_url,registration_live,venues(name,address,courts(count)),event_days(id,label,date,day_division_sources(sources(name,last_success_at,last_status,last_provenance)))")
    .eq("published", true).limit(1).single();
  if (error) throw error;
  const [info, slots, announcements] = await Promise.all([
    supabase.from("info_links").select("id,category,title,url,description,sort").eq("event_id", event.id).eq("published", true).order("sort"),
    supabase.from("sponsor_slots").select("id,placement,headline,offer_text,court_id,sponsors(id,name,logo_path,url),courts(id,label)").eq("event_id", event.id).eq("published", true).order("id"),
    supabase.from("announcements").select("id,title,body,severity,starts_at,ends_at,published,division_id,area_id").eq("event_id", event.id).eq("published", true).order("created_at"),
  ]);
  for (const result of [info, slots, announcements]) if (result.error) throw result.error;
  // Save published rows before time filtering so future announcements can become active offline.
  return { event, info: info.data ?? [], slots: slots.data ?? [], announcements: announcements.data ?? [] };
}
type Content = Awaited<ReturnType<typeof loadEventContent>>;
// Server side read of the same published content the Info and Sponsors screens use.
export const readEventContent = () => withDeviceCache(loadEventContent, deviceStorage(), CONTENT_CACHE_KEY);
export const eventContentQuery = queryOptions({
  queryKey: ["event-content"],
  staleTime: 30_000,
  refetchInterval: 30_000,
  networkMode: "always",
  initialData: () => savedData<Content>(CONTENT_CACHE_KEY),
  initialDataUpdatedAt: 0,
  queryFn: () => withDeviceCache(loadEventContent, deviceStorage(), CONTENT_CACHE_KEY),
  select: (data) => ({ ...data, announcements: activeAnnouncements(data.announcements, Date.now()) }),
});
