# FitTrack

A private, single-user gym journal: log workouts, track strength progression and personal records.
Built with Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui and Supabase.

> **Status:** Phase 1 complete: project setup, database, authentication and security.

## Requirements

- **Node.js 20.9 or newer** (22 LTS recommended; see `.nvmrc`). Next.js 16 does not run on Node 19.
- **Docker Desktop**, for the local Supabase stack.
- A Supabase project, for the hosted deployment.

## Quick start (local)

```bash
npm install
npm run db:start          # starts local Supabase and applies supabase/migrations
cp .env.example .env.local # fill with the URL + publishable key printed by db:start
npm run dev
```

Open http://localhost:3000. You are sent to **/login**, which links to **/setup** while no account exists.
Create your owner account there. Once it exists, registration closes for good.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate route types and run `tsc` |
| `npm run db:start` / `db:stop` | Start / stop local Supabase |
| `npm run db:reset` | Recreate the local DB from migrations (**deletes local data**) |
| `npm run db:types` | Regenerate `src/types/database.ts` from the local schema |
| `npm run db:push` | Apply migrations to the linked hosted project |
| `npm run test:db` | RLS/constraint security tests (local DB only; run `db:reset` before and after) |

## Hosted Supabase setup

1. Create a project at supabase.com (choose the region closest to you).
2. Link it and push the migrations:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npm run db:push
   ```
3. **Authentication → URL Configuration**
   - Site URL: your deployed URL (e.g. `https://fittrack.example.com`)
   - Redirect URLs: `https://<your-domain>/auth/confirm` and `http://localhost:3000/auth/confirm`
4. **Authentication → Providers → Email**: keep *Confirm email* on. Set minimum password length 10 and require
   lower/upper case letters and digits (matches the app's validation).
5. **Authentication → Email Templates → Confirm signup**: change the link to
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard`
6. Copy **Project URL** and the **publishable key** into your environment variables.
7. After creating your account at `/setup`, also turn off **Allow new users to sign up**
   (Authentication → Sign In / Providers). The database already rejects a second account; this is defence in depth.

## Environment variables

See [`.env.example`](.env.example). Only browser-safe values are used:

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable (`sb_publishable_…`) key. Data is protected by RLS |
| `NEXT_PUBLIC_SITE_URL` | Public URL of the app, used in email links |

The Supabase secret/service-role key is **never** used by the app.

## Security model

- **Single account:** a `BEFORE INSERT` trigger on `auth.users` rejects any sign-up once an account exists.
  `public.is_setup_complete()` exposes only a boolean, so the UI can show or hide setup.
- **Row Level Security** on every table. Private rows require `user_id = auth.uid()`. Built-in exercises
  (`user_id IS NULL`) are read-only. Anonymous visitors have no table privileges at all.
- **Composite foreign keys** `(parent_id, user_id)` make it impossible to attach a child row to
  another account's parent.
- **Proxy** (`src/proxy.ts`) refreshes the session cookie and redirects signed-out visitors; server
  code re-verifies the session through `getCurrentUser()` (Data Access Layer); the database enforces RLS.
- **Validation:** Zod on the server for every form, plus database `CHECK` constraints.

## Database

Migrations live in `supabase/migrations/`:

1. `…_core_schema.sql`: tables, constraints, indexes, `updated_at` triggers
2. `…_auth_and_security.sql`: single-account guard, profile trigger, privileges, RLS policies
3. `…_reference_data.sql`: muscle groups and the built-in exercise library (67 exercises)

```
auth.users ─1:1─ profiles
profiles ─1:N─ exercises (custom; built-ins have user_id NULL) ─N:M─ muscle_groups (via exercise_secondary_muscles)
profiles ─1:N─ workout_plans ─1:N─ workout_days ─1:N─ plan_exercises ─N:1─ exercises
profiles ─1:N─ workout_sessions ─1:N─ session_exercises ─1:N─ exercise_sets
                     │ plan_id / workout_day_id: ON DELETE SET NULL (history survives plan edits)
profiles ─1:N─ personal_records (unique per exercise + record type) ─→ exercise_sets / workout_sessions
```

`session_exercises.exercise_name` and `workout_sessions.name` are snapshots, so history stays intact when
plans or exercises are renamed or deleted.

## Project structure

```
src/
  app/                 Routes only (thin pages/layouts)
    (auth)/            login, setup (public)
    (app)/             private routes (dashboard, …)
    auth/confirm/      email confirmation route handler
  components/
    ui/                shadcn/ui primitives
    forms/             form building blocks
    brand/             logo
  features/<domain>/   business logic per domain: actions.ts, queries.ts, schemas.ts, components/
  lib/                 supabase clients, env validation, utilities
  config/              route constants
  types/               generated database types
  proxy.ts             session refresh + route protection
supabase/
  migrations/          versioned SQL
  tests/               database security tests
```

Upcoming phases add `features/{exercises,planner,workouts,analytics}`, `components/charts` and `hooks/`.

## Roadmap

1. ✅ Setup, database, authentication, security
2. Responsive UI shell and dashboard
3. Exercise library
4. Workout planner
5. Workout tracking and sessions
6. Progress analytics and personal records
7. PWA, testing, deployment
