-- ============================================================================
-- Fast-ILA · Central firm calendar + lawyer emails (Meet via one account)
-- ============================================================================
-- Pivots Google Meet creation from per-lawyer OAuth (which hits the sensitive-
-- scope "test user"/verification wall) to ONE firm Google Workspace account
-- connected once. That account mints every booking's Meet link and the lawyer
-- + client are added as attendees (Google emails them the invite). No lawyer
-- ever has to OAuth.
--
--  • calendar_connections.kind = 'lawyer' (default) | 'firm'  (firm row has
--    lawyer_id NULL); a partial unique index allows exactly one firm row per provider.
--  • lawyers.email — so the assigned lawyer can be invited as an attendee.
-- Additive + idempotent.
-- ============================================================================

alter table public.calendar_connections
  add column if not exists kind text not null default 'lawyer';

create unique index if not exists calendar_connections_firm_uniq
  on public.calendar_connections (provider) where kind = 'firm';

alter table public.lawyers
  add column if not exists email text;
