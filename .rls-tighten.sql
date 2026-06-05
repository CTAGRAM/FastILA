-- Production-grade RLS

create or replace function public.current_role()
returns text language sql stable as $$
  select coalesce(
    nullif((auth.jwt() -> 'app_metadata' ->> 'role')::text, ''),
    nullif((auth.jwt() -> 'user_metadata' ->> 'role')::text, ''),
    'anon'
  );
$$;

create or replace function public.current_email()
returns text language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.is_staff()
returns boolean language sql stable as $$
  select public.current_role() in ('admin', 'lawyer', 'wet_specialist');
$$;

-- Drop the wide-open policies from the previous step
drop policy if exists lawyers_anon_write on public.lawyers;
drop policy if exists templates_anon_write on public.templates;
drop policy if exists ai_prompts_anon_write on public.ai_prompts;
drop policy if exists lenders_anon_write on public.lenders;
drop policy if exists brokers_anon_write on public.brokers;
drop policy if exists bookings_anon_write on public.bookings;
drop policy if exists signatures_anon_write on public.signatures;
drop policy if exists documents_anon_write on public.documents;
drop policy if exists payments_anon_write on public.payments;

-- Lawyers
drop policy if exists lawyers_read on public.lawyers;
drop policy if exists lawyers_staff_write on public.lawyers;
create policy lawyers_read on public.lawyers for select using (active or public.is_staff());
create policy lawyers_staff_write on public.lawyers for all using (public.is_staff()) with check (public.is_staff());

-- Services / matter_types / lenders / brokers
drop policy if exists services_read on public.services;
create policy services_read on public.services for select using (true);
drop policy if exists services_write on public.services;
create policy services_write on public.services for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists matter_types_read on public.matter_types;
create policy matter_types_read on public.matter_types for select using (true);
drop policy if exists matter_types_write on public.matter_types;
create policy matter_types_write on public.matter_types for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists lenders_read on public.lenders;
create policy lenders_read on public.lenders for select using (true);
drop policy if exists lenders_write on public.lenders;
create policy lenders_write on public.lenders for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists brokers_read on public.brokers;
create policy brokers_read on public.brokers for select using (public.is_staff());
drop policy if exists brokers_write on public.brokers;
create policy brokers_write on public.brokers for all using (public.is_staff()) with check (public.is_staff());

-- Prompts + templates
drop policy if exists ai_prompts_read on public.ai_prompts;
create policy ai_prompts_read on public.ai_prompts for select using (public.is_staff());
drop policy if exists ai_prompts_write on public.ai_prompts;
create policy ai_prompts_write on public.ai_prompts for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists templates_read on public.templates;
create policy templates_read on public.templates for select using (true);
drop policy if exists templates_write on public.templates;
create policy templates_write on public.templates for all using (public.is_staff()) with check (public.is_staff());

-- Bookings
drop policy if exists bookings_insert_anon on public.bookings;
create policy bookings_insert_anon on public.bookings for insert with check (true);
drop policy if exists bookings_owner_read on public.bookings;
create policy bookings_owner_read on public.bookings for select using (
  public.is_staff()
  or lower(client_email) = public.current_email()
  or lower(coalesce(second_signatory_email, '')) = public.current_email()
);
drop policy if exists bookings_owner_update on public.bookings;
create policy bookings_owner_update on public.bookings for update
  using (public.is_staff() or lower(client_email) = public.current_email())
  with check (public.is_staff() or lower(client_email) = public.current_email());
drop policy if exists bookings_staff_delete on public.bookings;
create policy bookings_staff_delete on public.bookings for delete using (public.is_staff());

-- Signatures / documents / payments
drop policy if exists signatures_rw on public.signatures;
create policy signatures_rw on public.signatures for all
  using (public.is_staff() or booking_id in (
    select id from public.bookings where lower(client_email) = public.current_email() or lower(coalesce(second_signatory_email, '')) = public.current_email()
  ))
  with check (public.is_staff() or booking_id in (
    select id from public.bookings where lower(client_email) = public.current_email()
  ));

drop policy if exists documents_rw on public.documents;
create policy documents_rw on public.documents for all
  using (public.is_staff() or booking_id in (
    select id from public.bookings where lower(client_email) = public.current_email() or lower(coalesce(second_signatory_email, '')) = public.current_email()
  ))
  with check (public.is_staff() or booking_id in (
    select id from public.bookings where lower(client_email) = public.current_email()
  ));

drop policy if exists payments_rw on public.payments;
create policy payments_rw on public.payments for all
  using (public.is_staff() or booking_id in (
    select id from public.bookings where lower(client_email) = public.current_email() or lower(coalesce(second_signatory_email, '')) = public.current_email()
  ))
  with check (public.is_staff() or booking_id in (
    select id from public.bookings where lower(client_email) = public.current_email()
  ));

-- Storage policies (client-docs bucket)
drop policy if exists client_docs_anon_select on storage.objects;
drop policy if exists client_docs_anon_insert on storage.objects;
drop policy if exists client_docs_anon_update on storage.objects;
drop policy if exists client_docs_anon_delete on storage.objects;
drop policy if exists client_docs_select on storage.objects;
drop policy if exists client_docs_insert on storage.objects;
drop policy if exists client_docs_update on storage.objects;
drop policy if exists client_docs_delete on storage.objects;

create policy client_docs_select on storage.objects for select using (
  bucket_id = 'client-docs' and (
    public.is_staff()
    or (storage.foldername(name))[1]::uuid in (
      select id from public.bookings
      where lower(client_email) = public.current_email()
         or lower(coalesce(second_signatory_email, '')) = public.current_email()
    )
  )
);
create policy client_docs_insert on storage.objects for insert with check (
  bucket_id = 'client-docs' and (
    public.is_staff()
    or (storage.foldername(name))[1]::uuid in (
      select id from public.bookings where lower(client_email) = public.current_email()
    )
  )
);
create policy client_docs_update on storage.objects for update using (
  bucket_id = 'client-docs' and (
    public.is_staff()
    or (storage.foldername(name))[1]::uuid in (
      select id from public.bookings where lower(client_email) = public.current_email()
    )
  )
);
create policy client_docs_delete on storage.objects for delete using (
  bucket_id = 'client-docs' and public.is_staff()
);

notify pgrst, 'reload schema';
