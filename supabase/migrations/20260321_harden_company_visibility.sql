-- Harden assessor/company visibility without changing the current portal link model.
-- Goal: authenticated assessors only read data from their own company; master keeps global access.

begin;

-- =========================================================
-- AIS ACCOUNTS
-- =========================================================
drop policy if exists "Allow all for anon" on public.ais_accounts;
drop policy if exists "auth_company_ais_accounts" on public.ais_accounts;

create policy "auth_company_ais_accounts"
on public.ais_accounts
for all
to authenticated
using (
  is_master()
  or exists (
    select 1
    from public.applicants a
    join public.members m on m.company_id = a.company_id
    where a.id = ais_accounts.applicant_id
      and m.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.groups g
    join public.members m on m.company_id = g.company_id
    where g.id = ais_accounts.group_id
      and m.user_id = auth.uid()
  )
)
with check (
  is_master()
  or exists (
    select 1
    from public.applicants a
    join public.members m on m.company_id = a.company_id
    where a.id = ais_accounts.applicant_id
      and m.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.groups g
    join public.members m on m.company_id = g.company_id
    where g.id = ais_accounts.group_id
      and m.user_id = auth.uid()
  )
);

-- =========================================================
-- ERROR LOGS
-- =========================================================
drop policy if exists "auth_read_errors" on public.error_logs;
drop policy if exists "auth_update_errors" on public.error_logs;
drop policy if exists "auth_company_error_logs_select" on public.error_logs;
drop policy if exists "auth_company_error_logs_update" on public.error_logs;

create policy "auth_company_error_logs_select"
on public.error_logs
for select
to authenticated
using (
  is_master()
  or exists (
    select 1
    from public.members m
    where m.company_id = error_logs.company_id
      and m.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.applications ap
    join public.applicants a on a.id = ap.applicant_id
    join public.members m on m.company_id = a.company_id
    where ap.id = error_logs.application_id
      and m.user_id = auth.uid()
  )
);

create policy "auth_company_error_logs_update"
on public.error_logs
for update
to authenticated
using (
  is_master()
  or exists (
    select 1
    from public.members m
    where m.company_id = error_logs.company_id
      and m.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.applications ap
    join public.applicants a on a.id = ap.applicant_id
    join public.members m on m.company_id = a.company_id
    where ap.id = error_logs.application_id
      and m.user_id = auth.uid()
  )
)
with check (
  is_master()
  or exists (
    select 1
    from public.members m
    where m.company_id = error_logs.company_id
      and m.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.applications ap
    join public.applicants a on a.id = ap.applicant_id
    join public.members m on m.company_id = a.company_id
    where ap.id = error_logs.application_id
      and m.user_id = auth.uid()
  )
);

-- =========================================================
-- FILL LOGS
-- =========================================================
drop policy if exists "fill_logs_select_auth" on public.fill_logs;
drop policy if exists "public_read_fill_logs" on public.fill_logs;
drop policy if exists "fill_logs_select_auth_company" on public.fill_logs;

create policy "fill_logs_select_auth_company"
on public.fill_logs
for select
to authenticated
using (
  is_master()
  or exists (
    select 1
    from public.applicants a
    join public.members m on m.company_id = a.company_id
    where a.id = fill_logs.applicant_id
      and m.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.applications ap
    join public.applicants a on a.id = ap.applicant_id
    join public.members m on m.company_id = a.company_id
    where ap.id = fill_logs.application_id
      and m.user_id = auth.uid()
  )
);

-- =========================================================
-- SETTINGS
-- Only expose the shared DS-160 security question broadly.
-- Secrets remain visible only to master.
-- =========================================================
drop policy if exists "Allow anon read settings" on public.settings;
drop policy if exists "Usuarios autenticados podem ler configuracoes" on public.settings;
drop policy if exists "public_read_security_question" on public.settings;
drop policy if exists "auth_read_safe_settings" on public.settings;

create policy "public_read_security_question"
on public.settings
for select
to public
using (key_name = 'security_question');

create policy "auth_read_safe_settings"
on public.settings
for select
to authenticated
using (
  is_master()
  or key_name = 'security_question'
);

commit;
