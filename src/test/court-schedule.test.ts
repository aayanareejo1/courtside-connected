import { describe, expect, it } from 'vitest';
import { courtSchedule, hasMapPosition, courtsByNumber } from '@/lib/court-schedule';
const now = Date.parse('2026-10-18T14:00:00Z');
const match = (id: string, minutes: number, status = 'scheduled', duration = 60) => ({ id, start_at: new Date(now + minutes * 60000).toISOString(), status, est_duration_min: duration });
describe('Court schedule selection', () => {
 it('shows earliest next match and exactly three later matches sorted without mutation', () => {
  const rows = [match('five', 150), match('three', 90), match('one', 30), match('four', 120), match('two', 60)];
  const result = courtSchedule(rows, now);
  expect(result.featured?.id).toBe('one'); expect(result.nextThree.map(m => m.id)).toEqual(['two','three','four']);
  expect(rows.map(m => m.id)).toEqual(['five','three','one','four','two']);
 });
 it('shows current match and next three, including the next day', () => {
  const result = courtSchedule([match('today',30),match('tomorrow',1440),match('later',60),match('current',-10,'live')], now);
  expect(result.current?.id).toBe('current'); expect(result.featured?.id).toBe('current');
  expect(result.nextThree.map(m => m.id)).toEqual(['today','later','tomorrow']);
 });
 it('retains an explicitly live match beyond its estimated finish', () => {
  expect(courtSchedule([match('late',-90,'live')],now).featured?.id).toBe('late');
 });
 it('uses a scheduled match in its playing window without claiming a live source', () => {
  expect(courtSchedule([match('playing',-10)],now).current?.id).toBe('playing');
 });
 it('excludes cancelled, finals and expired scheduled matches from upcoming slots', () => {
  const result = courtSchedule([match('cancel',30,'cancelled'),match('final',-5,'final'),match('expired',-60),match('next',45)],now);
  expect(result.featured?.id).toBe('next'); expect(result.nextThree).toEqual([]); expect(result.finals.map(m => m.id)).toEqual(['final']);
 });
 it('treats a start exactly now as current, and an estimated end exactly now as finished', () => {
  expect(courtSchedule([match('start',0)],now).current?.id).toBe('start');
  expect(courtSchedule([match('end',-60)],now).featured).toBeUndefined();
 });
 it('returns no duplicate or invented matches for one or zero rows', () => {
  expect(courtSchedule([match('single',30)],now).nextThree).toEqual([]);
  expect(courtSchedule([],now)).toEqual({current:undefined,featured:undefined,nextThree:[],finals:[]});
 });
 it('ignores invalid start times', () => { expect(courtSchedule([{...match('invalid',0),start_at:'bad'}],now).featured).toBeUndefined(); });
});
describe('Court map position and number lookup', () => {
 it.each([{map_x:null,map_y:40},{map_x:30,map_y:null},{map_x:NaN,map_y:40},{map_x:Infinity,map_y:40},{map_x:-1,map_y:40},{map_x:40,map_y:101}])('rejects missing or invalid positions %j', c => { expect(hasMapPosition(c)).toBe(false); });
 it('accepts zero and valid boundary positions', () => { expect(hasMapPosition({map_x:0,map_y:100})).toBe(true); });
 it('sorts all court numbers naturally', () => { expect(courtsByNumber([{label:'23'},{label:'5'},{label:'13'},{label:'9'}]).map(c=>c.label)).toEqual(['5','9','13','23']); });
 it('finds numbered courts with whitespace, optional Court prefix or leading zeros', () => {
  const courts=[{label:'5'},{label:'17'},{label:'13'}];
  expect(courtsByNumber(courts,'1').map(c=>c.label)).toEqual(['13','17']);
  expect(courtsByNumber(courts,' Court 05 ').map(c=>c.label)).toEqual(['5']);
  expect(courtsByNumber(courts,'99')).toEqual([]);
 });
});
