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
