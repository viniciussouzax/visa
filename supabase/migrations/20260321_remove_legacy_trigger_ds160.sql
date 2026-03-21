begin;

drop trigger if exists trg_ds160_auto_job on public.applicants;
drop trigger if exists trg_ds160_auto_job_insert on public.applicants;

drop function if exists public.notify_ds160_job();

commit;
