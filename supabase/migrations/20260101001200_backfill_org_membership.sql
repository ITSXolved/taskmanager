-- ============================================================================
-- Backfill organization membership for existing accounts so super-admin
-- org/admin filters include everyone (and their tasks).
--   1. Any profile without an org -> "Ayadi Directors"
--   2. Any user without a manager -> earliest admin/super_admin in their org
-- Safe to re-run (only fills NULLs).
-- ============================================================================

update public.profiles
set org_id = (select id from public.organizations where name = 'Ayadi Directors')
where org_id is null;

update public.profiles u
set manager_id = (
  select a.id
  from public.profiles a
  where a.role in ('admin', 'super_admin')
    and a.org_id = u.org_id
    and a.id <> u.id
  order by a.created_at
  limit 1
)
where u.role = 'user' and u.manager_id is null;
