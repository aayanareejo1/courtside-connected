import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { MatchTime } from '@/components/MatchDetails';
import { homeSummary } from '@/lib/home-summary';
import { recommendedArrivalTime } from '@/lib/schedule';
import { useFollows } from '@/lib/follows';
import type { EventData } from '@/lib/event-data';
import { t } from '@/lib/i18n';

export function HomeOverview({ data }: { data: EventData }) {
  const { follows } = useFollows();
  const [now, setNow] = useState(0);
  useEffect(() => { setNow(Date.now()); const timer = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(timer); }, []);
  const summary = homeSummary(data.matches, data.players, follows, data.sources, now, data.offlineSavedAt);
  const match = summary.next;
  const court = data.courts.find(c => c.id === match?.court_id);
  const teams = (m: EventData['matches'][number]) => `${data.teams.find(x => x.id === m.home_team_id)?.name ?? t.court.tbd} ${t.court.vs} ${data.teams.find(x => x.id === m.away_team_id)?.name ?? t.court.tbd}`;
  return <section aria-label={t.demo.overview} className="space-y-3 border-b pb-4">
    <div><h2 className="text-xl font-bold uppercase">{t.demo.now}</h2>
      <p className="text-sm">{now === 0 ? t.search.loading : summary.current ? teams(summary.current) : t.demo.noCurrent}</p>
    </div>
    <div><h2 className="text-xl font-bold uppercase">{summary.personal ? t.demo.yourNext : t.demo.next}</h2>
      {now === 0 ? <p className="text-sm">{t.search.loading}</p> : match ? <>
        <p className="break-words text-sm font-semibold">{teams(match)}</p>
        <p className="flex flex-wrap items-center gap-x-3 text-sm">{court ? <Link className="tap inline-flex items-center text-primary underline" to="/courts/$courtId" params={{ courtId: court.id }}>{t.map.court} {court.label} · {court.areas?.name}</Link> : <span>{match.court_label_raw ?? t.schedule.courtUnknown}</span>}
          <span>{t.schedule.start} <MatchTime value={match.start_at} estimated={match.time_estimated} /></span>
          <span>{t.schedule.arrive} <MatchTime value={recommendedArrivalTime(match.start_at)} arrival /></span>
        </p>
      </> : <p className="text-sm">{summary.personal ? t.schedule.noUpcoming : t.demo.noNext}</p>}
      {summary.personal && <Link to="/following" className="tap inline-flex items-center text-sm font-semibold text-primary underline">{t.schedule.title}</Link>}
    </div>
  </section>;
}
