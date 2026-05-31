-- ============================================================================
-- TeamFlow — Realtime
-- Add tables to the supabase_realtime publication. REPLICA IDENTITY FULL
-- ensures UPDATE/DELETE events carry the previous row payload.
-- ============================================================================

alter table public.tasks         replica identity full;
alter table public.comments      replica identity full;
alter table public.notifications replica identity full;
alter table public.activity_logs replica identity full;

do $$
begin
  -- The publication is created automatically by Supabase; guard just in case.
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.activity_logs;
