-- Tighten public portal policies by binding them to the portal org/company
-- sent in request headers by the frontend.

begin;

create or replace function public.portal_request_company_id_text()
returns text
language sql
stable
as $$
  select nullif((current_setting('request.headers', true)::json ->> 'x-portal-company-id'), '')
$$;

create or replace function public.portal_request_org()
returns text
language sql
stable
as $$
  select nullif((current_setting('request.headers', true)::json ->> 'x-portal-org'), '')
$$;

-- =========================================================
-- APPLICANTS
-- =========================================================
drop policy if exists "portal_select_applicants" on public.applicants;
drop policy if exists "portal_update_applicants" on public.applicants;
drop policy if exists "portal_insert_applicants" on public.applicants;
drop policy if exists "portal_delete_applicants" on public.applicants;

create policy "portal_select_applicants"
on public.applicants
for select
to public
using (
  company_id::text = public.portal_request_company_id_text()
);

create policy "portal_update_applicants"
on public.applicants
for update
to public
using (
  company_id::text = public.portal_request_company_id_text()
)
with check (
  company_id::text = public.portal_request_company_id_text()
);

create policy "portal_insert_applicants"
on public.applicants
for insert
to public
with check (
  company_id::text = public.portal_request_company_id_text()
);

create policy "portal_delete_applicants"
on public.applicants
for delete
to public
using (
  company_id::text = public.portal_request_company_id_text()
  and stage = 'screening'
  and status = 'todo'
);

-- =========================================================
-- APPLICATIONS
-- =========================================================
drop policy if exists "portal_select_applications" on public.applications;
drop policy if exists "portal_update_applications" on public.applications;
drop policy if exists "portal_insert_applications" on public.applications;

create policy "portal_select_applications"
on public.applications
for select
to public
using (
  exists (
    select 1
    from public.applicants
    where applicants.id = applications.applicant_id
      and applicants.company_id::text = public.portal_request_company_id_text()
  )
);

create policy "portal_update_applications"
on public.applications
for update
to public
using (
  exists (
    select 1
    from public.applicants
    where applicants.id = applications.applicant_id
      and applicants.company_id::text = public.portal_request_company_id_text()
  )
)
with check (
  exists (
    select 1
    from public.applicants
    where applicants.id = applications.applicant_id
      and applicants.company_id::text = public.portal_request_company_id_text()
  )
);

create policy "portal_insert_applications"
on public.applications
for insert
to public
with check (
  exists (
    select 1
    from public.applicants
    where applicants.id = applications.applicant_id
      and applicants.company_id::text = public.portal_request_company_id_text()
  )
);

-- =========================================================
-- GROUPS
-- =========================================================
drop policy if exists "portal_select_groups" on public.groups;
drop policy if exists "portal_insert_groups" on public.groups;

create policy "portal_select_groups"
on public.groups
for select
to public
using (
  company_id::text = public.portal_request_company_id_text()
);

create policy "portal_insert_groups"
on public.groups
for insert
to public
with check (
  company_id::text = public.portal_request_company_id_text()
);

-- =========================================================
-- COMPANIES
-- =========================================================
drop policy if exists "Anon Resolve Company By ShortId" on public.companies;
drop policy if exists "portal_select_companies" on public.companies;

create policy "portal_select_companies"
on public.companies
for select
to public
using (
  active = true
  and short_id = public.portal_request_org()
);

commit;
