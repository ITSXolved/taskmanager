-- ============================================================================
-- TeamFlow — Seed data
-- 1 admin + 3 users (+ auth identities), categories, 2 projects, sample tasks.
-- All seeded accounts use the password:  Password123!
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Auth users (the on_auth_user_created trigger creates matching profiles)
-- ---------------------------------------------------------------------------
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
   confirmation_token, recovery_token, email_change_token_new, email_change)
values
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000001','authenticated','authenticated',
   'alex.morgan@teamflow.io', crypt('Password123!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"name":"Alex Morgan","role":"admin","title":"Engineering Manager","must_change_password":false}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000002','authenticated','authenticated',
   'priya.sharma@teamflow.io', crypt('Password123!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"name":"Priya Sharma","role":"user","title":"Senior Frontend Engineer","must_change_password":false}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000003','authenticated','authenticated',
   'diego.ramirez@teamflow.io', crypt('Password123!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"name":"Diego Ramirez","role":"user","title":"Backend Engineer","must_change_password":false}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000004','authenticated','authenticated',
   'sara.lin@teamflow.io', crypt('Password123!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"name":"Sara Lin","role":"user","title":"Product Designer","must_change_password":false}',
   now(), now(), '', '', '', '');

-- Email identities (required for password sign-in).
insert into auth.identities
  (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
select
  u.id, u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email),
  'email', u.id::text, now(), now(), now()
from auth.users u
where u.id in (
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000004'
);

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
insert into public.categories (id, name, color, created_by) values
  ('c0000000-0000-0000-0000-000000000001','Frontend','#6366f1','a0000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000002','Backend','#14b8a6','a0000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000003','Design','#ec4899','a0000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000004','QA','#f59e0b','a0000000-0000-0000-0000-000000000001');

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------
insert into public.projects (id, title, description, owner_id, status, deadline, created_by) values
  ('40000000-0000-0000-0000-000000000001','Atlas Web Platform',
   'Rebuild of the customer-facing web platform with a new design system.',
   'a0000000-0000-0000-0000-000000000001','active', (current_date + 28),
   'a0000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000002','Mobile App v2',
   'Native mobile revamp with offline support and push notifications.',
   'a0000000-0000-0000-0000-000000000001','active', (current_date + 45),
   'a0000000-0000-0000-0000-000000000001');

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------
insert into public.tasks
  (id, project_id, title, description, priority, status, is_blocked, due_date, completed_at, created_by)
values
  ('70000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',
   'Implement responsive dashboard grid','Build the Power BI-style KPI grid.',
   'high','in_progress', false, now() + interval '2 days', null,'a0000000-0000-0000-0000-000000000001'),
  ('70000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000001',
   'Design KPI card component set','Reusable KPI cards with trend indicators.',
   'medium','done', false, now() - interval '2 days', now(),'a0000000-0000-0000-0000-000000000001'),
  ('70000000-0000-0000-0000-000000000003','40000000-0000-0000-0000-000000000001',
   'Set up authentication flow','Supabase email/password auth with forced reset.',
   'critical','in_review', false, now() + interval '1 day', null,'a0000000-0000-0000-0000-000000000001'),
  ('70000000-0000-0000-0000-000000000004','40000000-0000-0000-0000-000000000001',
   'Fix overdue checkout regression','Critical regression in checkout.',
   'critical','in_progress', true, now() - interval '3 days', null,'a0000000-0000-0000-0000-000000000001'),
  ('70000000-0000-0000-0000-000000000005','40000000-0000-0000-0000-000000000002',
   'Push notification service integration','Wire up FCM/APNs.',
   'high','in_progress', false, now() + interval '3 days', null,'a0000000-0000-0000-0000-000000000001'),
  ('70000000-0000-0000-0000-000000000006','40000000-0000-0000-0000-000000000002',
   'Offline cache strategy spike','Evaluate offline-first approaches.',
   'low','not_started', false, now() + interval '7 days', null,'a0000000-0000-0000-0000-000000000001');

-- ---------------------------------------------------------------------------
-- Assignees
-- ---------------------------------------------------------------------------
insert into public.task_assignees (task_id, user_id) values
  ('70000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002'),
  ('70000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000004'),
  ('70000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000003'),
  ('70000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000003'),
  ('70000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000002'),
  ('70000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000003'),
  ('70000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000002');

-- ---------------------------------------------------------------------------
-- Task categories
-- ---------------------------------------------------------------------------
insert into public.task_categories (task_id, category_id) values
  ('70000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001'),
  ('70000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000003'),
  ('70000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000002'),
  ('70000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000001'),
  ('70000000-0000-0000-0000-000000000005','c0000000-0000-0000-0000-000000000002');

-- ---------------------------------------------------------------------------
-- A couple of comments (with an @mention)
-- ---------------------------------------------------------------------------
insert into public.comments (task_id, user_id, content, mentions) values
  ('70000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000003',
   '@Alex Morgan blocked on the API contract — flagging for visibility.',
   array['a0000000-0000-0000-0000-000000000001']::uuid[]),
  ('70000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002',
   'Pushed the latest changes, ready for another look.', '{}');
