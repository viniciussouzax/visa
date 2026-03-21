create or replace function public.backup_applicant_data()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
    -- Only backup when data actually changes and the previous snapshot is meaningful.
    if old.data is not null
       and old.data <> '{}'::jsonb
       and old.data is distinct from new.data then
        insert into public.applicant_data_backups (applicant_id, data_snapshot)
        values (old.id, old.data);

        -- Keep only the last 10 backups per applicant.
        delete from public.applicant_data_backups
        where applicant_id = old.id
          and id not in (
              select id
              from public.applicant_data_backups
              where applicant_id = old.id
              order by backed_up_at desc
              limit 10
          );
    end if;

    return new;
end;
$function$;
