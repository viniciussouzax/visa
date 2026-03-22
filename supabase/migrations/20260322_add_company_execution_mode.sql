alter table public.companies
add column if not exists execution_mode text not null default 'server';

update public.companies
set execution_mode = 'server'
where execution_mode is null
   or execution_mode not in ('server', 'extension');

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'companies_execution_mode_check'
    ) then
        alter table public.companies
        add constraint companies_execution_mode_check
        check (execution_mode in ('server', 'extension'));
    end if;
end $$;
