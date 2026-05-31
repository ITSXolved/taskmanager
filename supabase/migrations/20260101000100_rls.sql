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
