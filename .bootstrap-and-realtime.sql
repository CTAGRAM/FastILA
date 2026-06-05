-- =============================================================================
-- 1. Auto-promote the FIRST authenticated user to admin.
--    Subsequent users default to lawyer. Admin can change roles afterwards.
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  admin_count int;
  default_role text;
begin
  select count(*) into admin_count
  from auth.users
  where (raw_app_meta_data ->> 'role') = 'admin';

  if admin_count = 0 then
    default_role := 'admin';
  else
    default_role := 'lawyer';
  end if;

  new.raw_app_meta_data := coalesce(new.raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('role', default_role);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  before insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Also retro-promote anyone already signed in to ensure THEY get a role.
-- (admin: the most recently created; lawyer: anyone else)
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('role',
       case when id = (select id from auth.users order by created_at asc limit 1) then 'admin' else 'lawyer' end
     )
where (raw_app_meta_data ->> 'role') is null;

-- =============================================================================
-- 2. Relax lawyers/templates/ai_prompts/lenders/brokers write to "any signed-in
--    user" during early-deployment. (Tighter than before — anon can't write —
--    but loose enough that the admin can manage everything from the UI before
--    we wire fine-grained role checks.)
-- =============================================================================
drop policy if exists lawyers_staff_write on public.lawyers;
create policy lawyers_authed_write on public.lawyers
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists templates_write on public.templates;
create policy templates_authed_write on public.templates
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists ai_prompts_write on public.ai_prompts;
create policy ai_prompts_authed_write on public.ai_prompts
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists lenders_write on public.lenders;
create policy lenders_authed_write on public.lenders
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists brokers_write on public.brokers;
create policy brokers_authed_write on public.brokers
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- =============================================================================
-- 3. Enable Supabase Realtime on the platform's mutable tables so the dashboard
--    and client portal can subscribe to live changes across all sessions.
-- =============================================================================
alter publication supabase_realtime add table public.bookings;
alter publication supabase_realtime add table public.signatures;
alter publication supabase_realtime add table public.documents;
alter publication supabase_realtime add table public.payments;
alter publication supabase_realtime add table public.lawyers;

notify pgrst, 'reload schema';
