-- ============================================================================
-- Organizations (multi-tenant). Admins belong to an organization; users belong
-- to an admin (manager) and inherit that org. Super admins manage everything.
-- ============================================================================

create table if not exists public.organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists org_id     uuid references public.organizations (id) on delete set null,
  add column if not exists manager_id uuid references public.profiles (id) on delete set null;

create index if not exists idx_profiles_org     on public.profiles (org_id);
create index if not exists idx_profiles_manager on public.profiles (manager_id);

-- ---------------------------------------------------------------------------
-- Helpers (super_admin is a superset of admin)
-- ---------------------------------------------------------------------------
create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin' and is_active
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'super_admin') and is_active
  );
$$;

grant execute on function public.is_super_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- new-user trigger: also map org_id / manager_id from metadata
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles
    (id, name, email, role, title, phone, org_id, manager_id, must_change_password)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'user'),
    new.raw_user_meta_data ->> 'title',
    new.raw_user_meta_data ->> 'phone',
    nullif(new.raw_user_meta_data ->> 'org_id', '')::uuid,
    nullif(new.raw_user_meta_data ->> 'manager_id', '')::uuid,
    coalesce((new.raw_user_meta_data ->> 'must_change_password')::boolean, true)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS: everyone reads orgs; only super admins mutate
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;

drop policy if exists "orgs_select" on public.organizations;
create policy "orgs_select" on public.organizations
  for select to authenticated using (true);

drop policy if exists "orgs_super_write" on public.organizations;
create policy "orgs_super_write" on public.organizations
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- Seed: "Ayadi Directors" and place existing admins under it
-- ---------------------------------------------------------------------------
insert into public.organizations (name)
values ('Ayadi Directors')
on conflict (name) do nothing;

update public.profiles p
set org_id = o.id
from public.organizations o
where o.name = 'Ayadi Directors'
  and p.role in ('admin', 'super_admin')
  and p.org_id is null;
