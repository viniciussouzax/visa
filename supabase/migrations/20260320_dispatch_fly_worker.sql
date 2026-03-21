-- ============================================================
-- Supabase DB webhook -> Edge Function -> Fly.io Machines
-- Trigger applicants stage/status transitions that should wake workers.
-- ============================================================

create extension if not exists pg_net;

create or replace function public.notify_dispatch_job()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  function_url text;
  service_role_key text;
  payload jsonb;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.stage is not distinct from old.stage
     and new.status is not distinct from old.status then
    return new;
  end if;

  if not (
    (new.stage = 'ds160' and new.status in ('todo', 'retry'))
    or (new.stage = 'payment' and new.status = 'todo')
    or (new.stage = 'scheduling' and new.status = 'todo')
  ) then
    return new;
  end if;

  if old.stage is not distinct from new.stage
     and old.status is not distinct from new.status then
    return new;
  end if;

  function_url := 'https://zcpvknzktfmotvrybxdf.supabase.co/functions/v1/dispatch-job';
  service_role_key := 'YOUR_SUPABASE_SERVICE_ROLE_KEY';

  payload := jsonb_build_object(
    'type', tg_op,
    'table', tg_table_name,
    'schema', tg_table_schema,
    'old_record', to_jsonb(old),
    'record', to_jsonb(new)
  );

  perform net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := payload
  );

  return new;
end;
$$;

drop trigger if exists trg_dispatch_job_on_applicants on public.applicants;

create trigger trg_dispatch_job_on_applicants
after update on public.applicants
for each row
execute function public.notify_dispatch_job();
