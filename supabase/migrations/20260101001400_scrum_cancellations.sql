-- ============================================================================
-- Scrum Cancellations: track canceled Daily Scrum meetings per organization/date/time-slot.
-- ============================================================================

create table if not exists public.scrum_cancellations (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations (id) on delete cascade,
  date         date not null,
  time_slot    text not null,
  reason       text,
  cancelled_by uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (org_id, date, time_slot)
);

create index if not exists idx_scrum_cancellations_org_date on public.scrum_cancellations (org_id, date);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.scrum_cancellations enable row level security;

create policy "scrum_cancellations_select" on public.scrum_cancellations
  for select to authenticated using (true);

create policy "scrum_cancellations_write" on public.scrum_cancellations
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
alter table public.scrum_cancellations replica identity full;
alter publication supabase_realtime add table public.scrum_cancellations;
