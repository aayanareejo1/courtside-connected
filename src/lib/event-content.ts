import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { activeAnnouncements } from "@/lib/content-rules";

export const eventContentQuery = queryOptions({
  queryKey: ["event-content"],
  staleTime: 30_000,
  refetchInterval: 30_000,
  queryFn: async () => {
    const { data: event, error } = await supabase.from("events")
      .select("id,name,starts_on,ends_on,registration_url,registration_live,venues(name,address,courts(count)),event_days(id,label,date,day_division_sources(sources(name,last_success_at,last_status)))")
      .eq("published", true).limit(1).single();
    if (error) throw error;
    const [info, slots, announcements] = await Promise.all([
      supabase.from("info_links").select("id,category,title,url,description,sort").eq("event_id", event.id).eq("published", true).order("sort"),
      supabase.from("sponsor_slots").select("id,placement,headline,offer_text,court_id,sponsors(id,name,logo_path,url),courts(id,label)").eq("event_id", event.id).eq("published", true).order("id"),
      supabase.from("announcements").select("id,title,body,severity,starts_at,ends_at,published,division_id,area_id").eq("event_id", event.id).eq("published", true).order("created_at"),
    ]);
    for (const result of [info, slots, announcements]) if (result.error) throw result.error;
    return { event, info: info.data ?? [], slots: slots.data ?? [], announcements: activeAnnouncements(announcements.data ?? [], Date.now()) };
  },
});
