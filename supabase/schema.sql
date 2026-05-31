-- TeamFlow — Consolidated database migration (run top-to-bottom)


-- >>> 20260101000000_schema.sql
-- ============================================================================
-- TeamFlow — Core Schema
-- Enums, tables, foreign keys, and indexes.
-- ============================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid(), crypt()

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role      as enum ('admin', 'user');
create type public.task_priority  as enum ('critical', 'high', 'medium', 'low');
create type public.task_status    as enum ('not_started', 'in_progress', 'in_review', 'done');
create type public.project_status as enum ('planning', 'active', 'on_hold', 'completed');
create type public.notification_type as enum (
  'task_assigned', 'comment', 'mention', 'due_soon', 'status_change', 'project'
);

-- ---------------------------------------------------------------------------
-- profiles  (extends auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                    uuid primary key references auth.users (id) on delete cascade,
  name                  text not null,
  email                 text not null unique,
  role                  public.user_role not null default 'user',
  avatar_url            text,
  title                 text,
  phone                 text,
  is_active             boolean not null default true,
  must_change_password  boolean not null default true,
  created_at            timestamptz not null default now()
);
comment on table public.profiles is 'Application profile data, 1:1 with auth.users.';

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  owner_id    uuid references public.profiles (id) on delete set null,
  status      public.project_status not null default 'planning',
  deadline    date,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- tasks
--   completed_at / is_blocked / updated_at support the Phase 1 dashboards
--   (completion trend, "completed today", scrum blockers).
-- ---------------------------------------------------------------------------
create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references public.projects (id) on delete set null,
  title        text not null,
  description  text,
  priority     public.task_priority not null default 'medium',
  status       public.task_status not null default 'not_started',
  is_blocked   boolean not null default false,
  due_date     timestamptz,
  completed_at timestamptz,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- task_assignees  (many-to-many tasks <-> profiles)
-- ---------------------------------------------------------------------------
create table public.task_assignees (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique (task_id, user_id)
);

-- ---------------------------------------------------------------------------
-- categories  +  task_categories
-- ---------------------------------------------------------------------------
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  color      text not null default '#6366f1',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.task_categories (
  task_id     uuid not null references public.tasks (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  primary key (task_id, category_id)
);

-- ---------------------------------------------------------------------------
-- comments
-- ---------------------------------------------------------------------------
create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks (id) on delete cascade,
  user_id    uuid references public.profiles (id) on delete set null,
  content    text not null,
  mentions   uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- attachments
-- ---------------------------------------------------------------------------
create table public.attachments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks (id) on delete cascade,
  file_url    text not null,            -- storage object path inside the 'attachments' bucket
  file_name   text not null,
  file_type   text,
  file_size   bigint,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- activity_logs
-- ---------------------------------------------------------------------------
create table public.activity_logs (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid references public.tasks (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  actor_id   uuid references public.profiles (id) on delete set null,
  action     text not null,
  metadata   jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  type       public.notification_type not null,
  title      text not null,
  payload    jsonb not null default '{}',
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index idx_profiles_role            on public.profiles (role);
create index idx_projects_owner           on public.projects (owner_id);
create index idx_projects_status          on public.projects (status);
create index idx_tasks_project            on public.tasks (project_id);
create index idx_tasks_status             on public.tasks (status);
create index idx_tasks_priority           on public.tasks (priority);
create index idx_tasks_due_date           on public.tasks (due_date);
create index idx_tasks_created_by         on public.tasks (created_by);
create index idx_task_assignees_user      on public.task_assignees (user_id);
create index idx_task_assignees_task      on public.task_assignees (task_id);
create index idx_task_categories_category on public.task_categories (category_id);
create index idx_comments_task            on public.comments (task_id);
create index idx_attachments_task         on public.attachments (task_id);
create index idx_activity_task            on public.activity_logs (task_id);
create index idx_activity_project         on public.activity_logs (project_id);
create index idx_activity_created_at      on public.activity_logs (created_at desc);
create index idx_notifications_user_unread on public.notifications (user_id, is_read);


-- >>> 20260101000100_rls.sql
-- ============================================================================
-- TeamFlow — Row Level Security
-- Helper functions (SECURITY DEFINER to avoid RLS recursion) + policies.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active
  );
$$;

create or replace function public.is_assignee(_task_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.task_assignees
    where task_id = _task_id and user_id = auth.uid()
  );
$$;

-- A task is visible to admins, its creator, and any assignee.
create or replace function public.can_access_task(_task_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_admin()
    or exists (select 1 from public.tasks t where t.id = _task_id and t.created_by = auth.uid())
    or exists (select 1 from public.task_assignees ta where ta.task_id = _task_id and ta.user_id = auth.uid());
$$;

grant execute on function public.is_admin()             to authenticated;
grant execute on function public.is_assignee(uuid)      to authenticated;
grant execute on function public.can_access_task(uuid)  to authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.projects        enable row level security;
alter table public.tasks           enable row level security;
alter table public.task_assignees  enable row level security;
alter table public.categories      enable row level security;
alter table public.task_categories enable row level security;
alter table public.comments        enable row level security;
alter table public.attachments     enable row level security;
alter table public.activity_logs   enable row level security;
alter table public.notifications   enable row level security;

-- ---------------------------------------------------------------------------
-- profiles : self read/update, admin full access
-- ---------------------------------------------------------------------------
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "profiles_update_self" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_admin_write" on public.profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Prevent a non-admin from escalating their own role / reactivating themselves.
create or replace function public.guard_profile_changes()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.is_active is distinct from old.is_active then
    raise exception 'Only admins can change role or active status';
  end if;
  return new;
end;
$$;

create trigger trg_guard_profile_changes
  before update on public.profiles
  for each row execute function public.guard_profile_changes();

-- ---------------------------------------------------------------------------
-- projects : everyone reads, only admins mutate
-- ---------------------------------------------------------------------------
create policy "projects_select" on public.projects
  for select to authenticated using (true);

create policy "projects_admin_write" on public.projects
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- tasks : assignees/creator/admin read; creator & assignees update; creator/admin delete
-- ---------------------------------------------------------------------------
create policy "tasks_select" on public.tasks
  for select to authenticated
  using (public.is_admin() or created_by = auth.uid() or public.is_assignee(id));

create policy "tasks_insert" on public.tasks
  for insert to authenticated
  with check (public.is_admin() or created_by = auth.uid());

create policy "tasks_update" on public.tasks
  for update to authenticated
  using (public.is_admin() or created_by = auth.uid() or public.is_assignee(id))
  with check (public.is_admin() or created_by = auth.uid() or public.is_assignee(id));

create policy "tasks_delete" on public.tasks
  for delete to authenticated
  using (public.is_admin() or created_by = auth.uid());

-- ---------------------------------------------------------------------------
-- task_assignees : visible for accessible tasks / own rows; admin or task owner mutate
-- ---------------------------------------------------------------------------
create policy "task_assignees_select" on public.task_assignees
  for select to authenticated
  using (user_id = auth.uid() or public.can_access_task(task_id));

create policy "task_assignees_write" on public.task_assignees
  for all to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.tasks t where t.id = task_id and t.created_by = auth.uid())
  )
  with check (
    public.is_admin()
    or exists (select 1 from public.tasks t where t.id = task_id and t.created_by = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- categories : everyone reads, only admins write
-- ---------------------------------------------------------------------------
create policy "categories_select" on public.categories
  for select to authenticated using (true);

create policy "categories_admin_write" on public.categories
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- task_categories : scoped to task visibility
-- ---------------------------------------------------------------------------
create policy "task_categories_select" on public.task_categories
  for select to authenticated
  using (public.can_access_task(task_id));

create policy "task_categories_write" on public.task_categories
  for all to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.tasks t where t.id = task_id and t.created_by = auth.uid())
  )
  with check (
    public.is_admin()
    or exists (select 1 from public.tasks t where t.id = task_id and t.created_by = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- comments : scoped to task visibility; author owns their rows
-- ---------------------------------------------------------------------------
create policy "comments_select" on public.comments
  for select to authenticated
  using (public.can_access_task(task_id));

create policy "comments_insert" on public.comments
  for insert to authenticated
  with check (user_id = auth.uid() and public.can_access_task(task_id));

create policy "comments_update_own" on public.comments
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "comments_delete" on public.comments
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- attachments : scoped to task visibility; uploader/admin delete
-- ---------------------------------------------------------------------------
create policy "attachments_select" on public.attachments
  for select to authenticated
  using (public.can_access_task(task_id));

create policy "attachments_insert" on public.attachments
  for insert to authenticated
  with check (uploaded_by = auth.uid() and public.can_access_task(task_id));

create policy "attachments_delete" on public.attachments
  for delete to authenticated
  using (uploaded_by = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- activity_logs : scoped to task/project visibility
-- ---------------------------------------------------------------------------
create policy "activity_logs_select" on public.activity_logs
  for select to authenticated
  using (
    public.is_admin()
    or (task_id is not null and public.can_access_task(task_id))
    or (project_id is not null)               -- projects are readable by all authenticated users
  );

create policy "activity_logs_insert" on public.activity_logs
  for insert to authenticated
  with check (actor_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- notifications : strictly per-user
-- ---------------------------------------------------------------------------
create policy "notifications_select" on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "notifications_delete_own" on public.notifications
  for delete to authenticated
  using (user_id = auth.uid());

-- Inserts come from SECURITY DEFINER triggers / service-role edge functions,
-- both of which bypass RLS. Admins may also insert directly.
create policy "notifications_admin_insert" on public.notifications
  for insert to authenticated
  with check (public.is_admin());


-- >>> 20260101000200_triggers.sql
-- ============================================================================
-- TeamFlow — Triggers
-- New-user provisioning, timestamp maintenance, activity logging, notifications.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- auth.users -> profiles
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role, title, phone, must_change_password)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'user'),
    new.raw_user_meta_data ->> 'title',
    new.raw_user_meta_data ->> 'phone',
    coalesce((new.raw_user_meta_data ->> 'must_change_password')::boolean, true)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Generic updated_at
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

create trigger trg_comments_updated_at
  before update on public.comments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Maintain tasks.completed_at when status transitions to/from 'done'
-- ---------------------------------------------------------------------------
create or replace function public.handle_task_completion()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'done' and (old.status is distinct from 'done') then
    new.completed_at := coalesce(new.completed_at, now());
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger trg_task_completion
  before update on public.tasks
  for each row execute function public.handle_task_completion();

-- ---------------------------------------------------------------------------
-- Activity logging on tasks
-- ---------------------------------------------------------------------------
create or replace function public.log_task_activity()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.activity_logs (task_id, project_id, actor_id, action, metadata)
    values (new.id, new.project_id, auth.uid(), 'created task',
            jsonb_build_object('title', new.title));
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.activity_logs (task_id, project_id, actor_id, action, metadata)
    values (new.id, new.project_id, auth.uid(), 'changed status',
            jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  return new;
end;
$$;

create trigger trg_log_task_insert
  after insert on public.tasks
  for each row execute function public.log_task_activity();

create trigger trg_log_task_update
  after update on public.tasks
  for each row execute function public.log_task_activity();

-- ---------------------------------------------------------------------------
-- Notification: task assigned
-- ---------------------------------------------------------------------------
create or replace function public.notify_task_assigned()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_title text;
begin
  select title into v_title from public.tasks where id = new.task_id;

  -- Don't notify the person who assigned themselves.
  if new.user_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000') then
    insert into public.notifications (user_id, type, title, payload)
    values (
      new.user_id,
      'task_assigned',
      'You were assigned to "' || coalesce(v_title, 'a task') || '"',
      jsonb_build_object('task_id', new.task_id)
    );
  end if;

  insert into public.activity_logs (task_id, actor_id, action, metadata)
  values (new.task_id, auth.uid(), 'assigned a member',
          jsonb_build_object('user_id', new.user_id));
  return new;
end;
$$;

create trigger trg_notify_task_assigned
  after insert on public.task_assignees
  for each row execute function public.notify_task_assigned();

-- ---------------------------------------------------------------------------
-- Notification: comment + @mentions
-- ---------------------------------------------------------------------------
create or replace function public.notify_comment()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_title  text;
  v_target uuid;
begin
  select title into v_title from public.tasks where id = new.task_id;

  -- Notify task assignees (except the comment author).
  insert into public.notifications (user_id, type, title, payload)
  select ta.user_id, 'comment',
         'New comment on "' || coalesce(v_title, 'a task') || '"',
         jsonb_build_object('task_id', new.task_id, 'comment_id', new.id)
  from public.task_assignees ta
  where ta.task_id = new.task_id
    and ta.user_id <> new.user_id;

  -- Notify mentioned users (overrides as a 'mention' type).
  foreach v_target in array new.mentions loop
    if v_target <> new.user_id then
      insert into public.notifications (user_id, type, title, payload)
      values (v_target, 'mention',
              'You were mentioned on "' || coalesce(v_title, 'a task') || '"',
              jsonb_build_object('task_id', new.task_id, 'comment_id', new.id));
    end if;
  end loop;

  insert into public.activity_logs (task_id, actor_id, action, metadata)
  values (new.task_id, new.user_id, 'commented', jsonb_build_object('comment_id', new.id));
  return new;
end;
$$;

create trigger trg_notify_comment
  after insert on public.comments
  for each row execute function public.notify_comment();


-- >>> 20260101000300_storage.sql
-- ============================================================================
-- TeamFlow — Storage buckets & policies
--   avatars     : public, profile pictures           (path: <user_id>/<file>)
--   attachments : private, task files                (path: <task_id>/<file>)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Buckets
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880,  -- 5 MB
    array['image/png','image/jpeg','image/webp','image/gif']),
  ('attachments', 'attachments', false, 52428800,  -- 50 MB
    array[
      'image/png','image/jpeg','image/webp','image/gif',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  -- docx
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',        -- xlsx
      'text/plain',
      'application/zip'
    ])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- avatars : public read, owner writes own folder
-- ---------------------------------------------------------------------------
create policy "avatars_public_read" on storage.objects
  for select to public
  using (bucket_id = 'avatars');

create policy "avatars_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- attachments : scoped to task visibility (path's first folder = task_id)
-- ---------------------------------------------------------------------------
create policy "attachments_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'attachments'
    and public.can_access_task(((storage.foldername(name))[1])::uuid)
  );

create policy "attachments_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and owner = auth.uid()
    and public.can_access_task(((storage.foldername(name))[1])::uuid)
  );

create policy "attachments_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'attachments'
    and (owner = auth.uid() or public.is_admin())
  );


-- >>> 20260101000400_views_functions.sql
-- ============================================================================
-- TeamFlow — Reporting views & helper functions
-- Views use security_invoker so the caller's RLS applies.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- task_summary_by_user
-- ---------------------------------------------------------------------------
create or replace view public.task_summary_by_user
with (security_invoker = true) as
select
  p.id                                                              as user_id,
  p.name,
  count(t.id)                                                       as total,
  count(t.id) filter (where t.status = 'done')                      as completed,
  count(t.id) filter (where t.status in ('in_progress','in_review')) as in_progress,
  count(t.id) filter (where t.status <> 'done' and t.due_date < now()) as overdue,
  count(t.id) filter (where t.is_blocked)                           as blocked
from public.profiles p
left join public.task_assignees ta on ta.user_id = p.id
left join public.tasks t           on t.id = ta.task_id
group by p.id, p.name;

-- ---------------------------------------------------------------------------
-- overdue_tasks_by_member
-- ---------------------------------------------------------------------------
create or replace view public.overdue_tasks_by_member
with (security_invoker = true) as
select
  t.id            as task_id,
  t.title,
  t.priority,
  t.due_date,
  greatest(0, extract(day from now() - t.due_date)::int) as days_overdue,
  p.id            as member_id,
  p.name          as member_name,
  p.avatar_url
from public.tasks t
join public.task_assignees ta on ta.task_id = t.id
join public.profiles p        on p.id = ta.user_id
where t.status <> 'done' and t.due_date < now()
order by t.due_date asc;

-- ---------------------------------------------------------------------------
-- project_progress
-- ---------------------------------------------------------------------------
create or replace view public.project_progress
with (security_invoker = true) as
select
  pr.id,
  pr.title,
  pr.status,
  pr.deadline,
  count(t.id)                                  as task_count,
  count(t.id) filter (where t.status = 'done') as completed_count,
  case when count(t.id) = 0 then 0
       else round(100.0 * count(t.id) filter (where t.status = 'done') / count(t.id))
  end                                          as progress
from public.projects pr
left join public.tasks t on t.project_id = pr.id
group by pr.id, pr.title, pr.status, pr.deadline;

-- ---------------------------------------------------------------------------
-- scrum_daily_summary  (Done / In Progress / Blocked per member)
-- ---------------------------------------------------------------------------
create or replace view public.scrum_daily_summary
with (security_invoker = true) as
select
  p.id   as member_id,
  p.name as member_name,
  p.avatar_url,
  count(t.id) filter (where t.status = 'done')                       as done,
  count(t.id) filter (where t.status in ('in_progress','in_review')) as in_progress,
  count(t.id) filter (where t.is_blocked
                         or (t.status <> 'done' and t.due_date < now())) as blocked
from public.profiles p
left join public.task_assignees ta on ta.user_id = p.id
left join public.tasks t           on t.id = ta.task_id
where p.is_active
group by p.id, p.name, p.avatar_url;

-- ---------------------------------------------------------------------------
-- get_dashboard_stats(user_id, role)
--   role = 'admin' -> whole workspace; otherwise scoped to the user.
-- ---------------------------------------------------------------------------
create or replace function public.get_dashboard_stats(_user_id uuid, _role text)
returns json
language sql stable security definer set search_path = public
as $$
  with scoped as (
    select t.*
    from public.tasks t
    where _role = 'admin'
       or t.created_by = _user_id
       or exists (select 1 from public.task_assignees ta
                  where ta.task_id = t.id and ta.user_id = _user_id)
  )
  select json_build_object(
    'total',           count(*),
    'completed',       count(*) filter (where status = 'done'),
    'in_progress',     count(*) filter (where status in ('in_progress','in_review')),
    'overdue',         count(*) filter (where status <> 'done' and due_date < now()),
    'completed_today', count(*) filter (where completed_at::date = current_date),
    'due_today',       count(*) filter (where status <> 'done' and due_date::date = current_date),
    'completion_rate', case when count(*) = 0 then 0
                            else round(100.0 * count(*) filter (where status = 'done') / count(*))
                       end
  )
  from scoped;
$$;

-- ---------------------------------------------------------------------------
-- get_completion_trend(days)
-- ---------------------------------------------------------------------------
create or replace function public.get_completion_trend(_days integer default 30)
returns table(day date, completed bigint, created bigint)
language sql stable security definer set search_path = public
as $$
  with series as (
    select generate_series(current_date - (_days - 1), current_date, interval '1 day')::date as day
  )
  select
    s.day,
    (select count(*) from public.tasks t where t.completed_at::date = s.day) as completed,
    (select count(*) from public.tasks t where t.created_at::date   = s.day) as created
  from series s
  order by s.day;
$$;

grant execute on function public.get_dashboard_stats(uuid, text) to authenticated;
grant execute on function public.get_completion_trend(integer)   to authenticated;


-- >>> 20260101000500_realtime.sql
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


-- >>> 20260101000700_profiles_phone.sql
-- ============================================================================
-- Add phone (WhatsApp) to profiles. Safe to run on an existing database.
-- Also refreshes handle_new_user so it populates phone from user metadata.
-- ============================================================================

alter table public.profiles
  add column if not exists phone text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role, title, phone, must_change_password)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'user'),
    new.raw_user_meta_data ->> 'title',
    new.raw_user_meta_data ->> 'phone',
    coalesce((new.raw_user_meta_data ->> 'must_change_password')::boolean, true)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;


-- >>> 20260101000800_task_edit_guard.sql
-- ============================================================================
-- Assignees may only change a task's status. Admins and the task creator can
-- edit any field. Enforced at the DB level (defense in depth beyond the UI).
-- ============================================================================

create or replace function public.guard_task_field_edits()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- Admins and the creator can edit anything.
  if public.is_admin() or old.created_by = auth.uid() then
    return new;
  end if;

  -- Otherwise (assignee): only status may change. completed_at / updated_at are
  -- set by other triggers as a side effect of the status change and are allowed.
  if new.title       is distinct from old.title
     or new.description is distinct from old.description
     or new.priority   is distinct from old.priority
     or new.due_date   is distinct from old.due_date
     or new.project_id is distinct from old.project_id
     or new.is_blocked is distinct from old.is_blocked then
    raise exception 'Assignees can only change task status';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_task_field_edits on public.tasks;
create trigger trg_guard_task_field_edits
  before update on public.tasks
  for each row execute function public.guard_task_field_edits();


-- >>> 20260101000900_assignee_blockers.sql
-- ============================================================================
-- Allow assignees to flag/unflag a task as blocked (is_blocked), in addition to
-- changing status. All other fields remain admin/creator only.
-- ============================================================================

create or replace function public.guard_task_field_edits()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if public.is_admin() or old.created_by = auth.uid() then
    return new;
  end if;

  -- Assignee: only status and the blocked flag may change.
  if new.title       is distinct from old.title
     or new.description is distinct from old.description
     or new.priority   is distinct from old.priority
     or new.due_date   is distinct from old.due_date
     or new.project_id is distinct from old.project_id then
    raise exception 'Assignees can only change task status or the blocked flag';
  end if;

  return new;
end;
$$;

