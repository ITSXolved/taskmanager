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
