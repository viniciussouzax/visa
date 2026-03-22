create or replace function public.claim_application(app_id uuid, worker text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
    result jsonb;
    v_applicant_id uuid;
begin
    update public.applications
    set fill_status = 'doing',
        fill_started_at = now(),
        fill_worker_id = worker
    where id = app_id
      and fill_status in ('todo', 'retry')
    returning to_jsonb(applications.*), applicant_id into result, v_applicant_id;

    if result is not null and v_applicant_id is not null then
        update public.applicants
        set status = 'doing',
            updated_at = now()
        where id = v_applicant_id;
    end if;

    return result;
end;
$function$;
