-- ============================================================================
-- Add the 'super_admin' role. Must be in its own migration: a new enum value
-- cannot be used in the same transaction it is created in.
-- ============================================================================

alter type public.user_role add value if not exists 'super_admin';
