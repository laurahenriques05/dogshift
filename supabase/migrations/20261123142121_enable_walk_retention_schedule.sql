-- Approved retention rollout: enable the scheduler only for the existing walk purge.
begin;
create extension if not exists pg_cron with schema pg_catalog;
do $$ begin
 if to_regprocedure('private.purge_expired_walks()') is null then
  raise exception 'Install the approved walk_seven_day_retention migration first';
 end if;
 perform cron.schedule('pawshare-walk-seven-day-retention','* * * * *','select private.purge_expired_walks();');
end $$;
commit;
