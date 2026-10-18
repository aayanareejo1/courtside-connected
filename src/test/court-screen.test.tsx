import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import { CourtScreen } from '@/components/CourtScreen';
vi.mock('@tanstack/react-router',()=>({ Link:({children,to,params,...props}:any)=><a href={to.replace('$courtId',params?.courtId ?? '')} {...props}>{children}</a> }));
vi.mock('react-zoom-pan-pinch',()=>({TransformWrapper:({children}:any)=>children({zoomIn:()=>{},zoomOut:()=>{},resetTransform:()=>{}}),TransformComponent:({children}:any)=><div>{children}</div>}));
const courts=[{id:'5',label:'5',map_x:30,map_y:35,area_id:'a',stream_url:null},{id:'9',label:'9',map_x:null,map_y:null,area_id:'a',stream_url:null}];
const areas=[{id:'a',name:'Hall A',kind:'hall',x:5,y:5,w:90,h:90}];
const now=Date.parse('2026-10-18T14:00:00Z');
const matches=Array.from({length:5},(_,i)=>({id:String(i),start_at:new Date(now+(i+1)*3600000).toISOString(),status:'scheduled',est_duration_min:60,source_id:'sample',home:{name:`Home ${i}`},away:{name:`Away ${i}`},results:[]}));
const props={courts,areas,venue:{plan_width:1000,plan_height:700},matches,now};
afterEach(cleanup);
describe('Court screen outcomes',()=>{
 it('keeps matches visible without any map position or pin',()=>{
  render(<CourtScreen {...props} court={courts[1]!} />);
  expect(screen.queryByRole('group',{name:'Venue map'})).toBeNull();
  expect(within(screen.getByRole('region',{name:'Coming up'})).getByText(/Home 0/)).toBeDefined();
  expect(within(screen.getByRole('region',{name:'Coming up'})).getAllByRole('listitem')).toHaveLength(3);
 });
 it('highlights the selected court pin and routes number search to the matching court',()=>{
  render(<CourtScreen {...props} court={courts[0]!} />);
  const map=screen.getByRole('group',{name:'Venue map'});
  expect(within(map).getByRole('link',{name:'Court 5'}).getAttribute('aria-current')).toBe('page');
  expect(within(map).queryByRole('link',{name:'Court 9'})).toBeNull();
  fireEvent.change(screen.getByRole('searchbox'),{target:{value:'09'}});
  const nav=screen.getByRole('navigation',{name:'Courts list'});
  expect(within(nav).getByRole('link',{name:'Court 9'}).getAttribute('href')).toBe('/courts/9');
  expect(within(nav).queryByRole('link',{name:'Court 5'})).toBeNull();
 });
});
