import { MatchScore } from "@/components/MatchDetails";
import { TargetedAnnouncements } from "@/components/TargetedAnnouncements";
import { ScheduleSkeleton } from "@/components/ScheduleSkeleton";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { SourceBadges } from "@/components/SourceBadges";
import { ArrowLeft } from "lucide-react";
import { eventDataQuery, teamStaffQuery } from "@/lib/event-data";
import { FollowButton } from "@/components/FollowButton";
import { playerName } from "@/lib/search";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/teams/$teamId")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(eventDataQuery);
    const team = data.teams.find((team) => team.id === params.teamId);
    if (!team) throw notFound();
    await context.queryClient.ensureQueryData(teamStaffQuery(params.teamId));
    return { name: team.name };
  },
  head: ({ loaderData }) => ({ meta: [
    { title: `${loaderData?.name ?? "Team unavailable"} — Courtside Connected` },
    { name: "description", content: "Team schedule, match results and privacy-safe roster at OVA events." },
    { property: "og:title", content: `${loaderData?.name ?? "Team unavailable"} — Courtside Connected` },
    { property: "og:description", content: "Follow this team and see its schedule, results and roster." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    ...(!loaderData ? [{ name: "robots", content: "noindex" }] : []),
  ] }),
  component: TeamPage,
  pendingComponent: ScheduleSkeleton,
  pendingMs: 150,
  errorComponent: () => <p role="alert">{t.search.error}</p>,
  notFoundComponent: () => <p role="alert">{t.team.notFound}</p>,
});

function TeamPage() {
  const { teamId } = Route.useParams();
  const { data } = useSuspenseQuery(eventDataQuery);
  const { data: staff } = useSuspenseQuery(teamStaffQuery(teamId));
  const team = data.teams.find((team) => team.id === teamId);
  if (!team) return <p role="alert">{t.team.notFound}</p>;
  const club = data.clubs.find((club) => club.id === team.club_id);
  const players = data.players.filter((p) => p.team_id === teamId).sort((a, b) => (a.jersey_number ?? 999) - (b.jersey_number ?? 999));
  const matches = data.matches.filter((m) => m.home_team_id === teamId || m.away_team_id === teamId);
  const schedule = matches.filter((m) => m.status !== "final");
  const results = matches.filter((m) => m.status === "final");
  const renderMatches = (rows: typeof matches) => <ul className="mt-2 space-y-2">{rows.map((m) => {
    const court = data.courts.find((court) => court.id === m.court_id);
    const home = data.teams.find((team) => team.id === m.home_team_id);
    const away = data.teams.find((team) => team.id === m.away_team_id);
    const result = Array.isArray(m.results) ? m.results[0] : m.results;
    return <li key={m.id} className="space-y-2 rounded-lg bg-card p-3"><div className="flex flex-wrap justify-between gap-2 text-sm"><time dateTime={m.start_at} aria-label={`${t.schedule.start}: ${new Date(m.start_at).toLocaleString("en-CA", { timeZone: "America/Toronto" })}, ${t.schedule.timezone}${m.time_estimated ? `, ${t.schedule.estimated}` : ""}`}>{new Date(m.start_at).toLocaleString("en-CA", { timeZone: "America/Toronto", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}{m.time_estimated && <span className="text-muted-foreground"> ({t.schedule.estimatedShort})</span>}</time><span className="text-muted-foreground">{m.status === "final" ? t.team.final : m.status === "live" ? t.team.live : t.team.scheduled}</span></div><p className="font-semibold">{home?.name ?? t.court.tbd} <span className="font-normal text-muted-foreground">{t.court.vs}</span> {away?.name ?? t.court.tbd}</p><div className="flex justify-between gap-2">{court ? <Link to="/courts/$courtId" params={{ courtId: court.id }} className="tap inline-flex min-h-11 items-center text-sm text-primary underline-offset-4 hover:underline">{t.map.court} {court.label}</Link> : <span className="text-sm text-muted-foreground">{m.court_label_raw ?? t.team.unknownCourt}</span>}{result && <MatchScore home={home?.name ?? t.court.tbd} away={away?.name ?? t.court.tbd} homeSets={result.home_sets} awaySets={result.away_sets} final={m.status === "final"} className="font-bold" />}</div></li>;
  })}</ul>;
  return <div className="space-y-6">
    <Link to="/search" search={{ q: "" }} className="tap inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" aria-hidden />{t.team.back}</Link>
    <header className="space-y-3"><p className="text-sm text-muted-foreground">{club?.name} · {team.divisions.name}</p><h1 className="break-words text-4xl font-bold uppercase leading-tight">{team.name}</h1><FollowButton item={{ type: "team", id: team.id }} name={team.name} /></header>
    <TargetedAnnouncements divisionIds={[team.division_id]} />
    <section><h2 className="text-2xl font-bold uppercase">{t.team.schedule}</h2><SourceBadges matches={schedule} sources={data.sources} savedAt={data.offlineSavedAt} />{schedule.length ? renderMatches(schedule) : <p className="mt-2 text-muted-foreground">{t.team.noMatches}</p>}</section>
    {results.length > 0 && <section><h2 className="text-2xl font-bold uppercase">{t.team.results}</h2><SourceBadges matches={results} sources={data.sources} savedAt={data.offlineSavedAt} />{renderMatches(results)}</section>}
    <section><h2 className="text-2xl font-bold uppercase">{t.team.roster}</h2>{players.length ? <ul className="mt-2 space-y-2">{players.map((p) => <li key={p.id} className="flex items-center gap-3 rounded-lg bg-card p-3"><span className="w-10 shrink-0 font-display text-2xl font-bold text-primary" aria-label={`${t.team.jersey} ${p.jersey_number ?? "—"}`}>#{p.jersey_number ?? "—"}</span><span className="min-w-0 flex-1 font-semibold">{playerName(p.display_name)}</span><FollowButton item={{ type: "player", id: p.id }} name={playerName(p.display_name)} /></li>)}</ul> : <p className="mt-2 text-muted-foreground">{t.team.noPlayers}</p>}</section>
    {staff.length > 0 && <section><h2 className="text-2xl font-bold uppercase">{t.team.staff}</h2><ul className="mt-2 divide-y">{staff.map((person) => <li key={person.id} className="flex justify-between gap-3 py-3"><span>{person.display_name}</span><span className="text-sm text-muted-foreground">{person.role}</span></li>)}</ul></section>}
  </div>;
}
