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
