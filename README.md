# FitTrack

A private, single-user gym journal: log workouts, track strength progression and personal records.
Built with Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui and Supabase.

> **Status:** Phase 6 complete: progress analytics and personal records.

## Requirements

- **Node.js 22.12 or newer** (see `.nvmrc`). Next.js 16 and Vitest do not run on Node 19.
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
| `npm test` | Unit tests (Vitest) for statistics, dates and schedule logic |
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

> **shadcn note:** the shadcn CLI may add an unrelated `cn` npm package and import from it.
> After `npx shadcn add …`, replace `from "cn"` with `from "@/lib/utils"` and `npm uninstall cn`.

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
3. `…_reference_data.sql`: muscle groups and the built-in exercise library
4. `…_dashboard_support.sql`: profile timezone, `estimate_1rm()`, and the read-only views
   `session_summaries` and `exercise_session_bests` (`security_invoker`, so RLS applies)
5. `…_custom_exercises.sql`: `save_custom_exercise()` (atomic create/update with secondary
   muscles; custom names may not shadow built-ins) and three forearm exercises
6. `…_planner.sql`: one weekday per day per plan, and atomic planner functions
   (`create_workout_plan`, `set_active_plan`, `add/update/move_workout_day`,
   `add/move_plan_exercise`) with limits of 14 days per plan and 20 exercises per day
7. `…_workout_tracking.sql`: `start_workout_session` (from a plan day or empty; resumes an
   unfinished one), `save_workout_session` (idempotent full snapshot), `finish_workout_session`,
   `get_previous_performance`
8. `…_personal_records.sql`: `recompute_personal_records` (current best per exercise and type,
   rebuilt from logged sets), called when a workout is finished, edited or deleted
   (`delete_workout_session`); `finish_workout_session` returns the records a workout beat

```
auth.users ─1:1─ profiles
profiles ─1:N─ exercises (custom; built-ins have user_id NULL) ─N:M─ muscle_groups (via exercise_secondary_muscles)
profiles ─1:N─ workout_plans ─1:N─ workout_days ─1:N─ plan_exercises ─N:1─ exercises
profiles ─1:N─ workout_sessions ─1:N─ session_exercises ─1:N─ exercise_sets
                     │ plan_id / workout_day_id: ON DELETE SET NULL (history survives plan edits)
profiles ─1:N─ personal_records (unique per exercise + record type) ─→ exercise_sets / workout_sessions
```

## Exercise library

- 70 built-in exercises across chest, back, shoulders, biceps, triceps, forearms, legs and core.
  Built-ins are read-only.
- Custom exercises can be created, edited, archived (hidden from the library) and deleted.
  Exercises used in a plan or logged workout cannot be deleted (foreign keys), only archived.
- Search matches every word against name, muscles and equipment; results rank name matches first.
  Filters (muscle region, equipment, type, source, archived) are kept in the URL.

## Workout planner

- Plans contain ordered days. A day can be assigned a weekday (one day per weekday) or stay
  unscheduled, and can be a rest day (no exercises).
- Each planned exercise has target sets, a rep range, optional rest time and notes.
- One plan can be active; its day for today's weekday appears on the dashboard. Plans are optional.
- Templates (Push/Pull/Legs, Upper/Lower, Arnold Split, Full Body) are copied into a normal,
  editable plan. A unit test checks every template exercise exists in the built-in library.
- Deleting a plan or day never deletes logged workouts; sessions keep their own name snapshot.

## Workout tracking

- **Start** from today's planned day (dashboard), any plan day, or an empty workout (`/workout`).
  Only one workout can be in progress; a banner links back to it from every page.
- **Log** weight (kg, decimal comma accepted), reps and optional RPE per set. Tap the set number
  to mark a warm-up. Tap ✓ to complete a set; an empty row takes the suggested value (last time's
  matching set, else the row above). Only completed sets are saved to your history.
- **Last time**: each exercise shows the sets from the most recent completed session, and every
  row shows its matching previous set (warm-ups match warm-ups, working sets match working sets).
- **Rest timer** starts after each completed working set (plan rest time, else 90 s), with
  −15/+15/skip and a vibration when it ends.
- **Saving**: every change is written to an on-device draft instantly and autosaved to Supabase
  after a short pause, retried while offline and when the connection returns. Saves are full,
  idempotent snapshots with client-generated ids, so retries never duplicate sets.
- **Finish** drops unfinished rows and empty exercises and renumbers sets. **Discard** deletes
  the in-progress workout.
- **History** (`/history`) lists completed workouts by month. Each workout shows its sets, notes,
  totals, est. 1RM (labelled as an estimate) and a comparison with the previous time each exercise
  was trained. Workouts can be edited (sets, exercises, notes, start time, duration) or deleted.

## Progress and personal records

- **Progress** (`/progress`): workouts, volume, working sets and average duration for a range
  (7 days, 30 days, 3 months, 6 months, all time), each compared with the previous equal period;
  weekly (12 weeks) and monthly (12 months) volume charts; and every trained exercise with its
  heaviest top set (actual), best est. 1RM (estimated) and change between first and last session.
- **Exercise progression** (`/progress/exercises/[id]`): all-time records, a per-session chart
  (top set weight, est. 1RM, volume or most reps; estimates drawn dashed and labelled), range
  filters and a session table linking to each workout.
- **Personal records** (`/progress/records`): heaviest weight, most reps (single set) and best
  est. 1RM per exercise with the date achieved. Records are rebuilt from your sets whenever a
  workout is finished, edited or deleted, so they are never duplicated or stale. Finishing a
  workout announces records it beat (a first-ever log is not announced); sets holding a record
  carry a PR badge in the workout view.

## How statistics are calculated

All dashboard figures come from recorded sets. Nothing is estimated unless labelled.

- **Volume** = Σ weight × reps over completed, non-warm-up sets of completed workouts.
- **Weeks** are ISO weeks (Monday–Sunday) in the timezone set in Settings (detected at setup).
- **Estimated 1RM** uses the Epley formula `w × (1 + reps / 30)`, only for sets of 1–12 reps.
  It is always shown separately from actual top sets (weight × reps).
- **Records** use completed working sets only. Ties: heaviest weight prefers more reps, most reps
  prefers the heavier set, then the earliest date.
- **Period changes** compare the selected range with the equally long period just before it.
- **Progression highlights** compare an exercise's latest session with the session before it.
  Exercises with a single session are not compared.
- **Today's workout** is the day of the active plan whose weekday matches today.

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
  components/layout/   sidebar (desktop), header + bottom nav (mobile), page header
  components/charts/   shared chart theme and tooltip
  features/<domain>/   business logic per domain: actions.ts, queries.ts, schemas.ts, components/
                       (auth, dashboard, analytics, profile, exercises, planner, workouts)
  components/charts/   bar and line charts (one measure at a time, table fallback)
  hooks/               client hooks (useFormAction: forms that keep values on errors)
  lib/                 supabase clients, env validation, utilities
  config/              route constants and navigation
  types/               generated database types
  proxy.ts             session refresh + route protection
supabase/
  migrations/          versioned SQL
  tests/               database security tests
```

Each phase adds its pages to `src/config/navigation.ts`.

## Roadmap

1. ✅ Setup, database, authentication, security
2. ✅ Responsive UI shell and dashboard
3. ✅ Exercise library
4. ✅ Workout planner
5. ✅ Workout tracking and sessions
6. ✅ Progress analytics and personal records
7. PWA, testing, deployment
