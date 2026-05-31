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
