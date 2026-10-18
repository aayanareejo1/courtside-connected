import { SourceBadges } from "@/components/SourceBadges";
import { ScheduleSkeleton } from "@/components/ScheduleSkeleton";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Search, X, ChevronRight } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FollowButton } from "@/components/FollowButton";
import { eventDataQuery } from "@/lib/event-data";
import { matchesSearch, playerName } from "@/lib/search";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): { q: string; division?: string } => ({ q: typeof search["q"] === "string" ? search["q"] : "", ...(typeof search["division"] === "string" && search["division"] ? { division: search["division"] } : {}) }),
  loader: ({ context }) => context.queryClient.ensureQueryData(eventDataQuery),
  head: () => ({ meta: [
    { title: "Find people & places — Courtside Connected" },
    { name: "description", content: "Find a player, team, club, court or match at OVA events." },
    { property: "og:title", content: "Find people & places — Courtside Connected" },
    { property: "og:description", content: "Find players, teams, clubs and courts at OVA events." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: SearchPage,
  pendingComponent: ScheduleSkeleton,
  pendingMs: 150,
  notFoundComponent: () => <p role="alert">{t.search.error}</p>,
  errorComponent: () => <p role="alert">{t.search.error}</p>,
});

function Group({ title, children }: { title: string; children: ReactNode }) {
  return <section><h2 className="text-2xl font-bold uppercase">{title}</h2><ul className="mt-2 space-y-2">{children}</ul></section>;
}

function SearchPage() {
  const { q, division } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [input, setInput] = useState(q);
  useEffect(() => { setInput(q); }, [q]);
  const { data } = useSuspenseQuery(eventDataQuery);
  const teamName = (id: string | null) => data.teams.find((team) => team.id === id)?.name ?? t.court.tbd;
  const searching = Boolean(q.trim());
  const divisions = Array.from(new Set(data.teams.map((team) => team.divisions.name))).sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  const inDivision = (teamId: string) => !division || data.teams.find((team) => team.id === teamId)?.divisions.name === division;
  const players = searching ? data.players.filter((p) => inDivision(p.team_id) && matchesSearch(q, playerName(p.display_name), p.jersey_number, teamName(p.team_id))) : [];
  const teams = data.teams.filter((team) => (!division || team.divisions.name === division) && matchesSearch(q, team.name, team.divisions.name, data.clubs.find((club) => club.id === team.club_id)?.name));
  const clubs = searching ? data.clubs.filter((club) => matchesSearch(q, club.name, club.city)) : [];
  const courts = searching ? data.courts.filter((court) => matchesSearch(q, t.map.court, court.label, court.areas?.name)) : [];
  const matches = searching ? data.matches.filter((match) => matchesSearch(q, teamName(match.home_team_id), teamName(match.away_team_id), t.map.court, data.courts.find((court) => court.id === match.court_id)?.label, match.event_days.label)) : [];
  return <div className="space-y-6">
    <header><p className="text-sm text-muted-foreground">{data.event.name}</p><h1 className="text-4xl font-bold uppercase">{t.search.title}</h1></header>
    <form className="flex gap-2" role="search" onSubmit={(event) => { event.preventDefault(); navigate({ search: { q: input.trim(), ...(division ? { division } : {}) } }); }}>
      <div className="relative min-w-0 flex-1"><label htmlFor="event-search" className="sr-only">{t.search.label}</label><input id="event-search" type="search" value={input} onChange={(e) => setInput(e.target.value)} placeholder={t.search.placeholder} className="h-12 w-full rounded-md border bg-card pl-3 pr-11 text-base" />
        {input && <Button type="button" variant="ghost" size="icon" className="tap absolute right-0 top-1" aria-label={t.search.clear} onClick={() => { setInput(""); navigate({ search: { q: "", ...(division ? { division } : {}) } }); }}><X aria-hidden /></Button>}
      </div><Button type="submit" className="tap h-12 w-12" size="icon" aria-label={t.search.submit}><Search aria-hidden /></Button>
    </form>
    {divisions.length > 1 && <div role="group" aria-label={t.filters.label} className="flex flex-wrap gap-2">
      {[{ name: "", label: t.filters.all }, ...divisions.map((name) => ({ name, label: name }))].map((d) => <Button key={d.name || "all"} type="button" size="sm" variant={(division ?? "") === d.name ? "default" : "outline"} className="tap" aria-pressed={(division ?? "") === d.name} onClick={() => navigate({ search: { q, ...(d.name ? { division: d.name } : {}) } })}>{d.label}</Button>)}
    </div>}
    {searching && !players.length && !teams.length && !clubs.length && !courts.length && !matches.length && <p role="status" className="text-muted-foreground">{t.search.empty}</p>}
    {players.length > 0 && <Group title={t.search.players}>{players.map((p) => <li key={p.id} className="flex items-center gap-3 rounded-lg bg-card p-3"><Link to="/teams/$teamId" params={{ teamId: p.team_id }} className="min-w-0 flex-1"><p className="font-semibold">{playerName(p.display_name)} <span className="text-primary">#{p.jersey_number ?? "—"}</span></p><p className="text-sm text-muted-foreground">{teamName(p.team_id)}</p></Link><FollowButton item={{ type: "player", id: p.id }} name={playerName(p.display_name)} /></li>)}</Group>}
    {teams.length > 0 && <Group title={searching ? t.search.teams : t.search.browse}>{teams.map((team) => <li key={team.id} className="flex items-center gap-3 rounded-lg bg-card p-3"><Link className="min-w-0 flex-1" to="/teams/$teamId" params={{ teamId: team.id }}><p className="font-semibold">{team.name}</p><p className="text-sm text-muted-foreground">{team.divisions.name}</p></Link><FollowButton item={{ type: "team", id: team.id }} name={team.name} /></li>)}</Group>}
    {clubs.length > 0 && <Group title={t.search.clubs}>{clubs.map((club) => <li key={club.id}><Link to="/search" search={{ q: club.name }} className="tap flex items-center justify-between rounded-lg bg-card p-3"><span><strong>{club.name}</strong><span className="block text-sm text-muted-foreground">{club.city}</span></span><ChevronRight className="h-5 w-5 shrink-0" aria-hidden /></Link></li>)}</Group>}
    {courts.length > 0 && <Group title={t.search.courts}>{courts.map((court) => <li key={court.id}><Link to="/courts/$courtId" params={{ courtId: court.id }} className="tap flex items-center justify-between rounded-lg bg-card p-3"><span>{t.map.court} {court.label} · {court.areas?.name}</span><ChevronRight className="h-5 w-5 shrink-0" aria-hidden /></Link></li>)}</Group>}
    {matches.length > 0 && <section><h2 className="text-2xl font-bold uppercase">{t.search.matches}</h2><SourceBadges matches={matches} sources={data.sources} savedAt={data.offlineSavedAt} /><ul className="mt-2 space-y-2">{matches.map((match) => <li key={match.id} className="rounded-lg bg-card p-3"><p className="text-sm text-muted-foreground">{new Date(match.start_at).toLocaleString("en-CA", { timeZone: "America/Toronto", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p><Link to="/teams/$teamId" params={{ teamId: match.home_team_id ?? match.away_team_id ?? "unknown" }} className="block py-1 font-semibold">{teamName(match.home_team_id)} {t.court.vs} {teamName(match.away_team_id)}</Link>{match.court_id && <Link to="/courts/$courtId" params={{ courtId: match.court_id }} className="text-sm text-primary">{t.map.court} {data.courts.find((court) => court.id === match.court_id)?.label}</Link>}</li>)}</ul></section>}
  </div>;
}
