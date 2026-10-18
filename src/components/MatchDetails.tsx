import { eventDateLabel, eventTime } from '@/lib/schedule';
import { t } from '@/lib/i18n';

export function MatchTime({ value, arrival = false, estimated = false, className }: { value: string | Date; arrival?: boolean; estimated?: boolean | undefined; className?: string }) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return <span>{t.provenance.timeUnknown}</span>;
  const label = `${arrival ? t.schedule.arrive : t.schedule.start}: ${eventDateLabel(date.toISOString())}, ${eventTime(date)}, ${t.schedule.timezone}${estimated ? `, ${t.schedule.estimated}` : ''}`;
  return <time dateTime={date.toISOString()} aria-label={label} className={className}>{eventTime(date)}</time>;
}
export function MatchScore({ home, away, homeSets, awaySets, final = false, className }: { home: string; away: string; homeSets: number; awaySets: number; final?: boolean; className?: string }) {
  return <span className={className} role="img" aria-label={`${final ? t.team.final : t.demo.score}: ${home}, ${homeSets} ${t.demo.sets}; ${away}, ${awaySets} ${t.demo.sets}`}>{homeSets}–{awaySets}</span>;
}
