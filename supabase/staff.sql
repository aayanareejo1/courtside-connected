-- Give an invited user staff access. First invite them in Supabase > Authentication > Users > Invite user,
-- then replace the email and run this. Staff can only post announcements (see AGENTS.md).
insert into public.user_roles (user_id, role)
select id, 'staff' from auth.users where email = 'staff@example.com'
on conflict (user_id, role) do nothing;
