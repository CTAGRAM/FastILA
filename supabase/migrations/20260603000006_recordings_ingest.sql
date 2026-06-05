-- ============================================================================
-- Fast-ILA · Automatic transcript capture scheduler (Phase 3b)
-- ============================================================================
-- Hourly pg_cron tick that nudges the `recordings-ingest` edge function to pull
-- Meet/Teams transcripts for recent calls. Reads the function URL + service-role
-- key from Vault (set at deploy time, never in this repo). No-ops until armed
-- and until at least one calendar is connected, so it's safe immediately.
--
-- Idempotent — safe to re-run.
-- ============================================================================

create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function public.fi_recordings_ingest_tick()
returns void language plpgsql security definer set search_path = public, vault, net as $$
declare v_url text; v_key text;
begin
  begin
    select decrypted_secret into v_url from vault.decrypted_secrets where name = 'fi_recordings_url' limit 1;
    select decrypted_secret into v_key from vault.decrypted_secrets where name = 'fi_service_role_key' limit 1;
  exception when others then return;
  end;
  if v_url is null or v_key is null then return; end if;
  if not exists (select 1 from public.calendar_connections where sync_enabled and status = 'connected') then
    return;
  end if;
  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
    body    := jsonb_build_object('source', 'pg_cron')
  );
exception when others then
  raise warning 'fi_recordings_ingest_tick skipped: %', sqlerrm;
end $$;

do $$ begin perform cron.unschedule('fi-recordings-ingest'); exception when others then null; end $$;
select cron.schedule('fi-recordings-ingest', '0 * * * *', $$ select public.fi_recordings_ingest_tick(); $$);
