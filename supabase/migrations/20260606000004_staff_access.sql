-- =============================================================================
-- Staff access control + 2-step lawyer approval
-- -----------------------------------------------------------------------------
-- A lawyer can only reach the dashboard after a 2-step verification:
--   1. admin adds them (a `pending` invite is created + an approve/reject email
--      is sent),
--   2. the lawyer clicks "Approve" in that email.
-- Access itself is granted by `app_metadata.role` (the single source of truth
-- that the live current_role()/is_staff() RLS helpers read) which is only ever
-- set server-side, only after approval. This table drives the workflow + the
-- real-time status the admin sees ("In progress" -> "Verified").
--
-- Keyed by email (not auth user id) so an invite can exist before the lawyer
-- has ever signed in; the matching public.staff row is created on first
-- approved login by the auth-gate function.
-- =============================================================================

create table if not exists public.staff_invites (
  email       text primary key,
  full_name   text,
  role        text not null default 'lawyer' check (role in ('admin','lawyer','wet_specialist')),
  lawyer_id   text,
  status      text not null default 'pending' check (status in ('pending','approved','rejected')),
  invited_by  uuid,
  invited_at  timestamptz not null default now(),
  decided_at  timestamptz
);

alter table public.staff_invites enable row level security;

-- Admin reads + manages all invites (matches staff_admin_write in policies.sql).
-- Edge functions use the service-role key and bypass RLS entirely.
drop policy if exists staff_invites_admin on public.staff_invites;
create policy staff_invites_admin on public.staff_invites
  for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

-- Live status for the admin Lawyers list (pending -> approved/rejected).
do $$ begin
  alter publication supabase_realtime add table public.staff_invites;
exception when others then null; end $$;

-- Display-only mirror on the active-members table.
alter table public.staff add column if not exists status text not null default 'approved';

-- Backfill the existing admins as approved so the Team list shows them.
insert into public.staff_invites (email, full_name, role, status, decided_at)
select email, full_name, role, 'approved', now() from public.staff
on conflict (email) do nothing;
