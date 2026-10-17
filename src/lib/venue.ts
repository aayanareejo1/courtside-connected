import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const venueQuery = queryOptions({
  queryKey: ["venue-map"],
  queryFn: async () => {
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
  },
});

export const courtMatchesQuery = (courtId: string) => queryOptions({
  refetchInterval: (q) => (q.state.data?.some((m) => m.status === "live") ? 15_000 : 30_000),
  queryKey: ["court-matches", courtId],
  queryFn: async () => {
    const { data, error } = await supabase.from("matches")
      .select("id,start_at,est_duration_min,time_estimated,status,home:teams!matches_home_team_id_fkey(id,name),away:teams!matches_away_team_id_fkey(id,name),results(home_sets,away_sets)")
      .eq("court_id", courtId).order("start_at");
    if (error) throw error;
    return data;
  },
});
