-- Fixes the streaming link. Updates one row, no deletes. Run in Supabase > SQL Editor.
-- The seed pointed "Watch live" at the sponsor page. OVA posts stream details on the event page, and the old OVA app
-- used a CBC Watch link that needed a membership, so say so honestly until OVA gives the real stream address.
update public.info_links
set title = 'Live streams',
    url = 'https://www.ontariovolleyball.org/ontario-championships',
    description = 'Stream details are posted on the OVA event page. Some streams need a membership.'
where category = 'streaming'
  and title = 'Watch live on CBC Connect';

-- Run this only after the floor plan image is added to the project as public/floor-plan.png (see the Lovable prompt):
-- update public.venues set floor_plan_path = '/floor-plan.png' where floor_plan_path is null;
