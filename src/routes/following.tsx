import { TargetedAnnouncements } from "@/components/TargetedAnnouncements";
import { ScheduleSkeleton } from "@/components/ScheduleSkeleton";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import { eventDataQuery } from "@/lib/event-data";
import { useFollows } from "@/lib/follows";
import { playerName } from "@/lib/search";
import { FollowButton } from "@/components/FollowButton";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { followedMatches, upcomingMatches, teamsWithoutUpcoming } from "@/lib/schedule";
import { FollowedSchedule } from "@/components/FollowedSchedule";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/following")({
  loader: ({ context }) => context.queryClient.ensureQueryData(eventDataQuery),
  head: () => ({ meta: [
    { title: "My schedule — Courtside Connected" },
    { name: "description", content: "Combined followed-team schedule, arrival times and cross-court clash warnings at OVA events." },
    { property: "og:title", content: "My schedule — Courtside Connected" },
    { property: "og:description", content: "Your followed players and teams, with arrival times and schedule clash warnings." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: FollowingPage,
  pendingComponent: ScheduleSkeleton,
  pendingMs: 150,
  notFoundComponent: () => <p role="alert">{t.search.error}</p>,
  errorComponent: () => <p role="alert">{t.search.error}</p>,
});

function FollowingPage() {
  const { data } = useSuspenseQuery(eventDataQuery);
  const { follows } = useFollows();
  const [now, setNow] = useState(0);
  useEffect(() => { setNow(Date.now()); const timer = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(timer); }, []);
  const teams = data.teams.filter((team) => follows.some((f) => f.type === "team" && f.id === team.id));
  const players = data.players.filter((player) => follows.some((f) => f.type === "player" && f.id === player.id));
  const matches = followedMatches(data.matches, data.players, follows);
  const upcoming = upcomingMatches(matches, now);
  const resolvedTeams = data.teams.filter((team) => teams.some((followed) => followed.id === team.id) || players.some((p) => p.team_id === team.id));
  const emptyTeams = teamsWithoutUpcoming(resolvedTeams, upcoming);
  const results = matches.filter((m) => m.status === "final").reverse();
  return <div className="space-y-6"><header><p className="text-sm text-muted-foreground">{data.event.name}</p><h1 className="text-4xl font-bold uppercase">{t.schedule.title}</h1><p className="mt-1 text-xs text-muted-foreground">{t.schedule.timezone}</p></header>
    <TargetedAnnouncements divisionIds={[...teams.map((x) => x.division_id), ...players.map((p) => data.teams.find((x) => x.id === p.team_id)?.division_id)]} />
    {!teams.length && !players.length && <div className="space-y-4 py-6"><Star className="h-8 w-8 text-muted-foreground" aria-hidden /><p className="text-muted-foreground">{t.follow.empty}</p><Button asChild className="tap"><Link to="/search" search={{ q: "" }}>{t.follow.find}</Link></Button></div>}
    {(teams.length > 0 || players.length > 0) && <Tabs defaultValue="upcoming">
      <TabsList className="mb-4 grid h-auto w-full grid-cols-3"><TabsTrigger className="tap" value="upcoming">{t.schedule.upcoming}</TabsTrigger><TabsTrigger className="tap" value="results">{t.schedule.results}</TabsTrigger><TabsTrigger className="tap" value="saved">{t.schedule.saved}</TabsTrigger></TabsList>
      <TabsContent value="upcoming"><FollowedSchedule data={data} matches={upcoming} />{emptyTeams.length > 0 && <ul className="mt-4 space-y-2">{emptyTeams.map((team) => <li key={team.id} className="border-t py-3"><Link to="/teams/$teamId" params={{ teamId: team.id }} className="tap inline-flex items-center font-semibold text-primary">{team.name}</Link><p className="text-sm text-muted-foreground">{t.schedule.teamNoUpcoming}</p></li>)}</ul>}</TabsContent>
      <TabsContent value="results"><FollowedSchedule data={data} matches={results} results /></TabsContent>
      <TabsContent value="saved" className="space-y-6">
    {teams.length > 0 && <section><h2 className="text-2xl font-bold uppercase">{t.follow.teams}</h2><ul className="mt-2 space-y-2">{teams.map((team) => <li key={team.id} className="flex items-center gap-3 rounded-lg bg-card p-3"><Link className="min-w-0 flex-1 font-semibold" to="/teams/$teamId" params={{ teamId: team.id }}>{team.name}</Link><FollowButton item={{ type: "team", id: team.id }} name={team.name} /></li>)}</ul></section>}
    {players.length > 0 && <section><h2 className="text-2xl font-bold uppercase">{t.follow.players}</h2><ul className="mt-2 space-y-2">{players.map((p) => <li key={p.id} className="flex items-center gap-3 rounded-lg bg-card p-3"><Link className="min-w-0 flex-1" to="/teams/$teamId" params={{ teamId: p.team_id }}><p className="font-semibold">{playerName(p.display_name)} · #{p.jersey_number ?? "—"}</p><p className="text-sm text-muted-foreground">{data.teams.find((team) => team.id === p.team_id)?.name}</p></Link><FollowButton item={{ type: "player", id: p.id }} name={playerName(p.display_name)} /></li>)}</ul></section>}
      </TabsContent></Tabs>}
  </div>;
}
