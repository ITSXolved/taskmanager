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
