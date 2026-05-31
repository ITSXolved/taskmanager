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
