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
