-- ============================================================================
-- Fast-ILA · Returning-client linking (client history)
-- ============================================================================
-- Links every booking to a single client record keyed by email, so a person
-- who comes back weeks later is recognised (never duplicated) and their full
-- history of bookings + certificates can be shown in the portal + dashboard.
--
-- A BEFORE INSERT trigger upserts the clients row and sets bookings.client_id.
-- Fully exception-guarded so it can NEVER block a booking insert. Existing
-- bookings are backfilled. Additive; no changes to existing policies.
-- Idempotent — safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Link function — upsert client by (lowercased) email, stamp client_id
-- ---------------------------------------------------------------------------
create or replace function public.fi_link_booking_client()
returns trigger language plpgsql security definer set search_path = public as $$
declare cid uuid; em text := lower(trim(coalesce(new.client_email, '')));
begin
  if em = '' then return new; end if;
  select id into cid from public.clients where lower(email) = em limit 1;
  if cid is null then
    insert into public.clients (full_name, email, phone)
    values (new.client_name, em, new.client_phone)
    returning id into cid;
  else
    -- keep the latest name/phone we've seen for this client
    update public.clients
      set full_name = coalesce(nullif(new.client_name, ''), full_name),
          phone     = coalesce(nullif(new.client_phone, ''), phone)
      where id = cid;
  end if;
  new.client_id := cid;
  return new;
exception when others then
  raise warning 'fi_link_booking_client skipped: %', sqlerrm;
  return new;
end $$;

drop trigger if exists trg_link_booking_client on public.bookings;
create trigger trg_link_booking_client
  before insert on public.bookings
  for each row execute function public.fi_link_booking_client();

-- ---------------------------------------------------------------------------
-- 2. Backfill existing bookings → clients (one client per distinct email)
-- ---------------------------------------------------------------------------
do $$
declare b record; cid uuid; em text;
begin
  for b in select * from public.bookings where client_id is null and coalesce(client_email,'') <> '' loop
    em := lower(trim(b.client_email));
    select id into cid from public.clients where lower(email) = em limit 1;
    if cid is null then
      insert into public.clients (full_name, email, phone) values (b.client_name, em, b.client_phone) returning id into cid;
    end if;
    update public.bookings set client_id = cid where id = b.id;
  end loop;
exception when others then
  raise warning 'client backfill skipped: %', sqlerrm;
end $$;

-- Helpful index for case-insensitive email history lookups.
create index if not exists bookings_email_lower_idx on public.bookings (lower(client_email));
