import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { readEventData } from "@/lib/event-data";
import { VENUE_CACHE_KEY, deviceStorage, savedData, withDeviceCache } from "@/lib/offline-cache";

async function loadVenue() {
    const { data: ev, error } = await supabase.from("events").select("venue_id").eq("published", true).limit(1).single();
    if (error) throw error;
    const vid = ev.venue_id;
    if (!vid) throw new Error("Published event has no venue");
    const [v, a, c] = await Promise.all([
      supabase.from("venues").select("id,name,plan_width,plan_height").eq("id", vid).single(),
      supabase.from("areas").select("id,name,kind,x,y,w,h").eq("venue_id", vid),
      supabase.from("courts").select("id,label,map_x,map_y,stream_url,area_id").eq("venue_id", vid),
    ]);
    for (const result of [v, a, c]) if (result.error) throw result.error;
    if (!v.data) throw new Error("Venue not found");
    return { venue: v.data, areas: a.data ?? [], courts: c.data ?? [] };
}
export const venueQuery = queryOptions({
  queryKey: ["venue-map"],
  networkMode: "always",
  staleTime: 30_000,
  initialData: () => savedData<Awaited<ReturnType<typeof loadVenue>>>(VENUE_CACHE_KEY),
  initialDataUpdatedAt: 0,
  queryFn: () => withDeviceCache(loadVenue, deviceStorage(), VENUE_CACHE_KEY),
});

export const courtMatchesQuery = (courtId: string) => queryOptions({
  networkMode: "always",
  refetchInterval: (q) => (q.state.data?.some((m) => m.status === "live") ? 15_000 : 30_000),
  queryKey: ["court-matches", courtId],
  queryFn: async () => {
    const data = await readEventData();
    return data.matches.filter((match) => match.court_id === courtId).map((match) => ({
      ...match,
      home: data.teams.find((team) => team.id === match.home_team_id) ?? null,
      away: data.teams.find((team) => team.id === match.away_team_id) ?? null,
      sources: data.sources ?? [],
      offlineSavedAt: data.offlineSavedAt,
    }));
  },
});
