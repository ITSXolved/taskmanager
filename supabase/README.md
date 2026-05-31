# TeamFlow — Supabase Backend (Phase 2)

Complete backend: schema, RLS, storage, realtime, views/functions, edge
functions, and seed data. Everything is declared as migrations so it can be
applied to a fresh project with one command.

## Layout

```
supabase/
├── config.toml                         # local stack + edge function config
├── seed.sql                            # 1 admin + 3 users + sample data
├── migrations/
│   ├── 20260101000000_schema.sql       # enums, tables, FKs, indexes
│   ├── 20260101000100_rls.sql          # helper fns + RLS policies (all tables)
│   ├── 20260101000200_triggers.sql     # new-user, updated_at, activity, notifications
│   ├── 20260101000300_storage.sql      # avatars + attachments buckets & policies
│   ├── 20260101000400_views_functions.sql  # reporting views + dashboard RPCs
│   ├── 20260101000500_realtime.sql     # realtime publication
│   └── 20260101000600_cron.sql         # schedule deadline reminders
└── functions/
    ├── _shared/                        # cors + admin/service-role helpers
    ├── create-user/                    # admin → create user, returns temp password
    ├── reset-password/                 # admin → reset password, returns temp password
    ├── deactivate-user/                # admin → ban/unban + is_active toggle
    └── send-deadline-reminders/        # cron → notify assignees of tasks due ≤24h
```

## Deploy to a hosted project

```bash
# 1. Install + log in
npm i -g supabase
supabase login

# 2. Link this repo to your project (find the ref in the dashboard URL)
supabase link --project-ref <PROJECT_REF>

# 3. Apply all migrations
supabase db push

# 4. Load seed data (optional, for demo/dev)
supabase db execute --file supabase/seed.sql

# 5. Deploy edge functions
supabase functions deploy create-user
supabase functions deploy reset-password
supabase functions deploy deactivate-user
supabase functions deploy send-deadline-reminders

# 6. (Cron) add the two vault secrets referenced in 20260101000600_cron.sql,
#    then re-run that migration or the cron.schedule() call.
```

Run the whole stack locally instead with `supabase start` (applies migrations +
seed automatically), then open Studio at http://localhost:54323.

## Seeded accounts

All use password **`Password123!`**:

| Role  | Email                       |
|-------|-----------------------------|
| Admin | alex.morgan@teamflow.io     |
| User  | priya.sharma@teamflow.io    |
| User  | diego.ramirez@teamflow.io   |
| User  | sara.lin@teamflow.io        |

## Phase 2 checklist → where it lives

| Item | Location |
|------|----------|
| All tables, types, constraints | `migrations/...schema.sql` |
| Foreign keys & indexes | `migrations/...schema.sql` |
| RLS enabled + policies (all tables) | `migrations/...rls.sql` |
| Storage buckets + policies | `migrations/...storage.sql` |
| Edge functions written | `functions/*` |
| Realtime enabled | `migrations/...realtime.sql` |
| Views + helper functions | `migrations/...views_functions.sql` |
| Seed data | `seed.sql` |
| Scheduled reminders (cron) | `migrations/...cron.sql` + `functions/send-deadline-reminders` |

## Notes

- **`completed_at`, `is_blocked`, `updated_at`** were added to `tasks` beyond the
  base spec — they back the Phase 1 completion-trend, "completed today", and
  scrum-blocker features.
- RLS helpers (`is_admin`, `can_access_task`, …) are `SECURITY DEFINER` to avoid
  policy recursion when reading `profiles`/`tasks`.
- Views use `security_invoker = true`, so the querying user's RLS still applies.
- Edge functions use the **service role key** (server-side only) and verify the
  caller is an admin before acting. Temp passwords are returned once and never
  stored.
