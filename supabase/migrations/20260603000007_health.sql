-- ============================================================================
-- Fast-ILA · Platform health RPC (Phase 4, Integrations Control Center)
-- ============================================================================
-- A single staff-only function the dashboard calls to render the control
-- centre: which schedulers are "armed" (Vault secrets present — names only, no
-- values) plus live counts across the automation / calendar / recording layers.
-- Additive, read-only. Idempotent.
-- ============================================================================

create or replace function public.fi_platform_health()
returns jsonb language plpgsql security definer set search_path = public, vault as $$
declare res jsonb; has_key boolean;
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;

  begin
    select exists (select 1 from vault.secrets where name = 'fi_service_role_key') into has_key;
  exception when others then has_key := false;
  end;

  select jsonb_build_object(
    'armed', jsonb_build_object(
      'dispatch',   has_key and exists (select 1 from vault.secrets where name = 'fi_edge_url'),
      'calendar',   has_key and exists (select 1 from vault.secrets where name = 'fi_calendar_url'),
      'recordings', has_key and exists (select 1 from vault.secrets where name = 'fi_recordings_url')
    ),
    'counts', jsonb_build_object(
      'rules_enabled',       (select count(*) from public.automation_rules where enabled),
      'msgs_pending',        (select count(*) from public.messages where status = 'pending'),
      'msgs_sent',           (select count(*) from public.messages where status = 'sent'),
      'msgs_failed',         (select count(*) from public.messages where status = 'failed'),
      'calendars_connected', (select count(*) from public.calendar_connections where status = 'connected'),
      'calendars_error',     (select count(*) from public.calendar_connections where status = 'error'),
      'recordings',          (select count(*) from public.recordings),
      'transcripts',         (select count(*) from public.transcripts)
    )
  ) into res;
  return res;
end $$;

revoke all on function public.fi_platform_health() from public, anon;
grant execute on function public.fi_platform_health() to authenticated;
