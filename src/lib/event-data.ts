import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { deviceStorage, savedData, withDeviceCache } from "@/lib/offline-cache";

async function loadEventData() {
    const { data: event, error } = await supabase.from("events").select("id,name,venue_id,warmup_min,walk_min").eq("published", true).limit(1).single();
    if (error) throw error;
    if (!event.venue_id) throw new Error("Published event has no venue");
    const [teams, players, clubs, courts, matches, sources] = await Promise.all([
      supabase.from("teams").select("id,name,club_id,division_id,divisions!inner(name,event_id)").eq("divisions.event_id", event.id).order("name").limit(2000),
      supabase.from("players").select("id,display_name,jersey_number,team_id,teams!inner(division_id,divisions!inner(event_id))").eq("teams.divisions.event_id", event.id).order("display_name").limit(20000),
      supabase.from("clubs").select("id,name,city").order("name"),
      supabase.from("courts").select("id,label,area_id,areas(name)").eq("venue_id", event.venue_id).order("number"),
      supabase.from("matches").select("id,source_id,start_at,status,court_id,court_label_raw,home_team_id,away_team_id,est_duration_min,time_estimated,event_days!inner(event_id,label),results(home_sets,away_sets)").eq("event_days.event_id", event.id).order("start_at").limit(20000),
      supabase.from("day_division_sources").select("sources(id,name,last_success_at,last_status,last_provenance),event_days!inner(event_id)").eq("event_days.event_id", event.id),
    ]);
    for (const result of [teams, players, clubs, courts, matches, sources]) if (result.error) throw result.error;
    const eventTeams = teams.data ?? [];
    return { event, sources: (sources.data ?? []).flatMap((row) => row.sources ? [row.sources] : []), teams: eventTeams, players: players.data ?? [], clubs: (clubs.data ?? []).filter((c) => eventTeams.some((team) => team.club_id === c.id)), courts: courts.data ?? [], matches: matches.data ?? [] };
}

export type EventData = Awaited<ReturnType<typeof loadEventData>> & { offlineSavedAt: number | null };
export const readEventData = (): Promise<EventData> => withDeviceCache(loadEventData, deviceStorage());

export const eventDataQuery = queryOptions({
  queryKey: ["event-directory"],
  networkMode: "always",
  initialData: () => savedData<Awaited<ReturnType<typeof loadEventData>>>(),
  initialDataUpdatedAt: 0,
  staleTime: 30_000,
  refetchInterval: (q) => (q.state.data?.matches.some((m) => m.status === "live") ? 15_000 : 30_000),
  queryFn: readEventData,
  retry: 1,
});

export const teamStaffQuery = (teamId: string) => queryOptions({
  queryKey: ["team-staff", teamId],
  networkMode: "always",
  initialData: () => savedData<{ rows: { id: string; display_name: string; role: string }[] }>(`courtside:v1:team-staff:${teamId}`),
  initialDataUpdatedAt: 0,
  select: (data) => data.rows,
  queryFn: () => withDeviceCache(async () => {
    const { data, error } = await supabase.from("staff_members").select("id,display_name,role").eq("team_id", teamId);
    if (error) throw error;
    return { rows: data ?? [] };
  }, deviceStorage(), `courtside:v1:team-staff:${teamId}`),
});
