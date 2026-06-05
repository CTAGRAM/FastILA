-- Row Level Security policies for Fast-ILA
-- Roles:
--   anon    — public booking form, can read services/lawyers, can create bookings
--   client  — signed-in client, can read/write only their own data
--   lawyer  — staff member, can read/write bookings assigned to them
--   admin   — staff member with admin role, full access

-- ---------------------------------------------------------------------------
-- Enable RLS on every table
-- ---------------------------------------------------------------------------
alter table public.staff                enable row level security;
alter table public.services             enable row level security;
alter table public.lawyers              enable row level security;
alter table public.matter_types         enable row level security;
alter table public.lenders              enable row level security;
alter table public.availability_slots   enable row level security;
alter table public.clients              enable row level security;
alter table public.bookings             enable row level security;
alter table public.booking_events       enable row level security;
alter table public.documents            enable row level security;
alter table public.signatures           enable row level security;
alter table public.payments             enable row level security;
alter table public.understanding_answers enable row level security;
alter table public.ai_prompts           enable row level security;
alter table public.templates            enable row level security;
alter table public.brokers              enable row level security;

-- ---------------------------------------------------------------------------
-- Helper predicates
-- ---------------------------------------------------------------------------
-- is_admin / is_staff use the staff table populated when invited

-- ---------------------------------------------------------------------------
-- staff: admin reads all, staff reads own row
-- ---------------------------------------------------------------------------
drop policy if exists staff_read_self on public.staff;
create policy staff_read_self on public.staff
  for select using (id = auth.uid() or public.current_role() = 'admin');

drop policy if exists staff_admin_write on public.staff;
create policy staff_admin_write on public.staff
  for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

-- ---------------------------------------------------------------------------
-- services / lawyers / matter_types / lenders — public read of active rows
-- ---------------------------------------------------------------------------
drop policy if exists services_read on public.services;
create policy services_read on public.services
  for select using (active or public.current_role() in ('admin','lawyer'));

drop policy if exists services_admin_write on public.services;
create policy services_admin_write on public.services
  for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

drop policy if exists lawyers_read on public.lawyers;
create policy lawyers_read on public.lawyers
  for select using (active or public.current_role() in ('admin','lawyer'));

drop policy if exists lawyers_admin_write on public.lawyers;
create policy lawyers_admin_write on public.lawyers
  for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

drop policy if exists matter_types_read on public.matter_types;
create policy matter_types_read on public.matter_types for select using (true);

drop policy if exists matter_types_admin_write on public.matter_types;
create policy matter_types_admin_write on public.matter_types
  for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

drop policy if exists lenders_read on public.lenders;
create policy lenders_read on public.lenders for select using (true);

drop policy if exists lenders_admin_write on public.lenders;
create policy lenders_admin_write on public.lenders
  for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

-- ---------------------------------------------------------------------------
-- availability_slots: public read, lawyer/admin write
-- ---------------------------------------------------------------------------
drop policy if exists availability_read on public.availability_slots;
create policy availability_read on public.availability_slots for select using (true);

drop policy if exists availability_write on public.availability_slots;
create policy availability_write on public.availability_slots
  for all using (
    public.current_role() = 'admin' or
    (public.current_role() = 'lawyer' and lawyer_id = public.current_lawyer_id())
  ) with check (
    public.current_role() = 'admin' or
    (public.current_role() = 'lawyer' and lawyer_id = public.current_lawyer_id())
  );

-- ---------------------------------------------------------------------------
-- clients: anon can insert (during booking); user/admin can read own row
-- ---------------------------------------------------------------------------
drop policy if exists clients_insert_anon on public.clients;
create policy clients_insert_anon on public.clients
  for insert with check (true);

drop policy if exists clients_read_self on public.clients;
create policy clients_read_self on public.clients
  for select using (
    user_id = auth.uid()
    or email = (auth.jwt() ->> 'email')
    or public.current_role() in ('admin','lawyer')
  );

drop policy if exists clients_update_self on public.clients;
create policy clients_update_self on public.clients
  for update using (
    user_id = auth.uid()
    or public.current_role() = 'admin'
  ) with check (
    user_id = auth.uid()
    or public.current_role() = 'admin'
  );

-- ---------------------------------------------------------------------------
-- bookings: anon can create (booking form); client reads own; staff reads scoped
-- ---------------------------------------------------------------------------
drop policy if exists bookings_create_anon on public.bookings;
create policy bookings_create_anon on public.bookings
  for insert with check (true);

drop policy if exists bookings_read on public.bookings;
create policy bookings_read on public.bookings
  for select using (
    public.current_role() = 'admin'
    or (public.current_role() = 'lawyer' and lawyer_id = public.current_lawyer_id())
    or client_email = (auth.jwt() ->> 'email')
    or client_id in (select id from public.clients where user_id = auth.uid())
  );

drop policy if exists bookings_update on public.bookings;
create policy bookings_update on public.bookings
  for update using (
    public.current_role() = 'admin'
    or (public.current_role() = 'lawyer' and lawyer_id = public.current_lawyer_id())
    or client_email = (auth.jwt() ->> 'email')
  ) with check (
    public.current_role() = 'admin'
    or (public.current_role() = 'lawyer' and lawyer_id = public.current_lawyer_id())
    or client_email = (auth.jwt() ->> 'email')
  );

drop policy if exists bookings_delete_admin on public.bookings;
create policy bookings_delete_admin on public.bookings
  for delete using (public.current_role() = 'admin');

-- ---------------------------------------------------------------------------
-- booking_events / documents / signatures / payments / understanding_answers
-- Tied to the parent booking
-- ---------------------------------------------------------------------------
drop policy if exists be_rw on public.booking_events;
create policy be_rw on public.booking_events for all using (
  exists (select 1 from public.bookings b where b.id = booking_id and (
    public.current_role() = 'admin'
    or (public.current_role() = 'lawyer' and b.lawyer_id = public.current_lawyer_id())
    or b.client_email = (auth.jwt() ->> 'email')
  ))
) with check (true);

drop policy if exists docs_rw on public.documents;
create policy docs_rw on public.documents for all using (
  exists (select 1 from public.bookings b where b.id = booking_id and (
    public.current_role() = 'admin'
    or (public.current_role() = 'lawyer' and b.lawyer_id = public.current_lawyer_id())
    or b.client_email = (auth.jwt() ->> 'email')
  ))
) with check (
  exists (select 1 from public.bookings b where b.id = booking_id and (
    public.current_role() in ('admin','lawyer')
    or b.client_email = (auth.jwt() ->> 'email')
  ))
);

drop policy if exists sigs_rw on public.signatures;
create policy sigs_rw on public.signatures for all using (
  exists (select 1 from public.bookings b where b.id = booking_id and (
    public.current_role() = 'admin'
    or (public.current_role() = 'lawyer' and b.lawyer_id = public.current_lawyer_id())
    or b.client_email = (auth.jwt() ->> 'email')
  ))
) with check (true);

drop policy if exists pay_rw on public.payments;
create policy pay_rw on public.payments for all using (
  exists (select 1 from public.bookings b where b.id = booking_id and (
    public.current_role() = 'admin'
    or (public.current_role() = 'lawyer' and b.lawyer_id = public.current_lawyer_id())
    or b.client_email = (auth.jwt() ->> 'email')
  ))
) with check (true);

drop policy if exists ua_rw on public.understanding_answers;
create policy ua_rw on public.understanding_answers for all using (
  exists (select 1 from public.bookings b where b.id = booking_id and (
    public.current_role() = 'admin'
    or (public.current_role() = 'lawyer' and b.lawyer_id = public.current_lawyer_id())
    or b.client_email = (auth.jwt() ->> 'email')
  ))
) with check (true);

-- ---------------------------------------------------------------------------
-- AI prompts / templates / brokers — admin only
-- ---------------------------------------------------------------------------
drop policy if exists ai_admin on public.ai_prompts;
create policy ai_admin on public.ai_prompts
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

drop policy if exists templates_read on public.templates;
create policy templates_read on public.templates
  for select using (public.current_role() in ('admin','lawyer'));

drop policy if exists templates_admin_write on public.templates;
create policy templates_admin_write on public.templates
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

drop policy if exists brokers_admin on public.brokers;
create policy brokers_admin on public.brokers
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- ---------------------------------------------------------------------------
-- Storage policies — client-docs bucket
-- File path convention: {booking_id}/{kind}/{filename}
-- ---------------------------------------------------------------------------
drop policy if exists client_docs_select on storage.objects;
create policy client_docs_select on storage.objects
  for select using (
    bucket_id = 'client-docs' and (
      public.current_role() in ('admin','lawyer')
      or (storage.foldername(name))[1]::uuid in (
        select id from public.bookings where client_email = (auth.jwt() ->> 'email')
      )
    )
  );

drop policy if exists client_docs_insert on storage.objects;
create policy client_docs_insert on storage.objects
  for insert with check (
    bucket_id = 'client-docs' and (
      public.current_role() in ('admin','lawyer')
      or (storage.foldername(name))[1]::uuid in (
        select id from public.bookings where client_email = (auth.jwt() ->> 'email')
      )
    )
  );

drop policy if exists certs_select on storage.objects;
create policy certs_select on storage.objects
  for select using (
    bucket_id = 'certificates' and (
      public.current_role() in ('admin','lawyer')
      or (storage.foldername(name))[1]::uuid in (
        select id from public.bookings where client_email = (auth.jwt() ->> 'email')
      )
    )
  );

drop policy if exists certs_write on storage.objects;
create policy certs_write on storage.objects
  for insert with check (
    bucket_id = 'certificates' and public.current_role() in ('admin','lawyer')
  );

drop policy if exists templates_select on storage.objects;
create policy templates_select on storage.objects
  for select using (bucket_id = 'templates');

drop policy if exists templates_admin_write on storage.objects;
create policy templates_admin_write on storage.objects
  for insert with check (bucket_id = 'templates' and public.current_role() = 'admin');
