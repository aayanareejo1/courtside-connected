import { describe, it, expect } from 'vitest';
import { homeSummary } from '@/lib/home-summary';
const now = Date.parse('2026-10-18T14:00:00Z');
const sources = [{id:'s',name:'Source',last_status:'ok',last_success_at:'2026-10-18T13:59:00Z',last_provenance:'live'}];
const match = {id:'m',source_id:'s',start_at:'2026-10-18T13:50:00Z',est_duration_min:60,court_id:'5',home_team_id:'a',away_team_id:'b',status:'live'};
describe('Home canonical overview', () => {
 it('shows confirmed current play only from a fresh live source', () => { expect(homeSummary([match],[],[],sources,now,null).current?.id).toBe('m'); });
 it.each(['sample','snapshot','metadata'])('never presents %s as current play', provenance => { expect(homeSummary([match],[],[],[{...sources[0],last_provenance:provenance}],now,null).current).toBeNull(); });
 it('does not call cached data current play', () => { expect(homeSummary([match],[],[],sources,now,now-60000).current).toBeNull(); });
 it('does not call a failed source current play', () => { expect(homeSummary([match],[],[],[{...sources[0],last_status:'error'}],now,null).current).toBeNull(); });
 it('resolves player follows and chooses earliest future match', () => {
 const later={...match,id:'later',status:'scheduled',start_at:'2026-10-18T16:00:00Z'};
 const first={...later,id:'first',start_at:'2026-10-18T15:00:00Z'};
 const unrelated={...later,id:'other',home_team_id:'z',away_team_id:'q',start_at:'2026-10-18T14:05:00Z'};
 expect(homeSummary([later,unrelated,first],[{id:'p',team_id:'a'}],[{type:'player',id:'p'}],sources,now,null).next?.id).toBe('first');
 });
 it('does not replace a followed team empty state with unrelated matches', () => { expect(homeSummary([{...match,status:'scheduled',start_at:'2026-10-18T16:00:00Z'}],[],[{type:'team',id:'z'}],sources,now,null).next).toBeNull(); });
 it('does not promote finished archived matches into next', () => { expect(homeSummary([{...match,status:'final'}],[],[],sources,now,null).next).toBeNull(); });
});
