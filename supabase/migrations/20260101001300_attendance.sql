-- ============================================================================
-- Attendance: per-org schedule (expected time + grace + work days), date
-- exemptions (holidays / alternate times), and per-member daily records.
-- ============================================================================

create table if not exists public.attendance_settings (
  org_id        uuid primary key references public.organizations (id) on delete cascade,
  expected_time time not null default '09:00',
  grace_minutes int  not null default 10,
  work_days     int[] not null default '{1,2,3,4,5}',  -- 0=Sun .. 6=Sat
  updated_by    uuid references public.profiles (id) on delete set null,
  updated_at    timestamptz not null default now()
);

create table if not exists public.attendance_exemptions (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations (id) on delete cascade,
  date         date not null,
  expected_time time,                 -- NULL = full holiday / day off
  reason       text,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (org_id, date)
);

create table if not exists public.attendance_records (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid references public.organizations (id) on delete set null,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  date          date not null,
  status        text not null check (status in ('present', 'absent', 'leave')),
  check_in_time time,
  marked_by     uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists idx_attendance_user_date on public.attendance_records (user_id, date);
create index if not exists idx_attendance_org_date  on public.attendance_records (org_id, date);

create trigger trg_attendance_updated_at
  before update on public.attendance_records
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.attendance_settings   enable row level security;
alter table public.attendance_exemptions enable row level security;
alter table public.attendance_records    enable row level security;

-- Schedule + exemptions: everyone reads (so users see expected times); admins write.
create policy "att_settings_select" on public.attendance_settings
  for select to authenticated using (true);
create policy "att_settings_write" on public.attendance_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "att_exemptions_select" on public.attendance_exemptions
  for select to authenticated using (true);
create policy "att_exemptions_write" on public.attendance_exemptions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Records: a member sees their own; admins/super see all and mark.
create policy "att_records_select" on public.attendance_records
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy "att_records_write" on public.attendance_records
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
alter table public.attendance_records replica identity full;
alter publication supabase_realtime add table public.attendance_records;
