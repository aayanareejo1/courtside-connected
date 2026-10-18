import React from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import { FollowedSchedule } from '@/components/FollowedSchedule';
import { FollowButton } from '@/components/FollowButton';
import { followsKey } from '@/lib/follows';
import type { EventData } from '@/lib/event-data';

vi.mock('@tanstack/react-router', () => ({ Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));
vi.mock('@/components/ui/button', () => ({ Button: ({ children, variant: _variant, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => <button {...props}>{children}</button> }));
const data = { event: { warmup_min: 45, walk_min: 10 }, teams: [{ id: 'a', name: 'Team A' }, { id: 'b', name: 'Team B' }], courts: [{ id: '5', label: '5' }], sources: [], offlineSavedAt: null } as unknown as EventData;
const rows = [{ id: 'one', source_id: null, home_team_id: 'a', away_team_id: 'b', start_at: '2026-10-18T14:00:00Z', status: 'scheduled', court_id: '5', court_label_raw: null, est_duration_min: 60, time_estimated: false, results: [] }, { id: 'two', source_id: null, home_team_id: 'b', away_team_id: 'a', start_at: '2026-10-18T14:30:00Z', status: 'scheduled', court_id: '5', court_label_raw: null, est_duration_min: 60, time_estimated: false, results: [] }] as unknown as EventData['matches'];
afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); });
describe('Follow controls and rendered schedule outcomes', () => {
 it('toggles the real follow control without account or network', () => {
  const fetchSpy=vi.fn(); vi.stubGlobal('fetch',fetchSpy);
  render(<FollowButton item={{type:'player',id:'p'}} name="Sam A." />);
  fireEvent.click(screen.getByRole('button',{name:'Follow Sam A.'}));
  expect(JSON.parse(localStorage.getItem(followsKey) ?? '[]')).toEqual([{type:'player',id:'p'}]);
  expect(screen.getByRole('button',{name:'Unfollow Sam A.'}).getAttribute('aria-pressed')).toBe('true');
  expect(fetchSpy).not.toHaveBeenCalled();
 });
 it('renders Toronto starts, fixed arrival guidance, court and tight turnaround', () => {
  render(<FollowedSchedule data={data} matches={rows} />);
  const items=screen.getAllByRole('listitem');
  expect(within(items[0]).getAllByText('10:00 a.m.')).toHaveLength(1);
  expect(within(items[0]).getByText('9:45 a.m.')).toBeDefined();
  expect(within(items[0]).getByText('Court 5')).toBeDefined();
  expect(within(items[0]).getByText(/Tight turnaround/)).toBeDefined();
 });
 it('renders the final score and never arrival guidance for a finished match', () => {
  render(<FollowedSchedule data={data} matches={[{...rows[0],status:'final',results:[{home_sets:2,away_sets:1}]}]} results />);
  expect(screen.getByText('2–1')).toBeDefined();
  expect(screen.queryByText('Arrive by')).toBeNull();
 });
});
