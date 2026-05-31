-- ============================================================================
-- TeamFlow — Schedule the deadline-reminder edge function (daily 08:00 UTC).
--
-- Requires pg_cron + pg_net (available on Supabase). The function URL and a
-- service-role key are read from Supabase Vault so no secrets live in SQL.
--
-- Before this runs, add the two secrets once (SQL editor or `supabase secrets`):
--   select vault.create_secret('https://<PROJECT_REF>.functions.supabase.co/send-deadline-reminders', 'edge_reminders_url');
--   select vault.create_secret('<SERVICE_ROLE_KEY>', 'edge_service_key');
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Drop a previous schedule with the same name if re-running.
select cron.unschedule('teamflow-deadline-reminders')
where exists (select 1 from cron.job where jobname = 'teamflow-deadline-reminders');

select cron.schedule(
  'teamflow-deadline-reminders',
  '0 8 * * *',
  $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'edge_reminders_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'edge_service_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
