# FitTrack

A private gym journal for up to two people: log workouts, track strength progression and personal records.
Built with Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui and Supabase.

> **Status:** all seven phases complete. Installable as a PWA; deployment guide in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Requirements

- **Node.js 22.12 or newer** (see `.nvmrc`). Next.js 16 and Vitest do not run on Node 19.
- **Docker Desktop**, for the local Supabase stack.
- A Supabase project and a Netlify account, for the hosted deployment ([guide](docs/DEPLOYMENT.md)).

## Quick start (local)

```bash
npm install
npm run db:start          # starts local Supabase and applies supabase/migrations
cp .env.example .env.local # fill with the URL + publishable key printed by db:start
npm run dev
```

Open http://localhost:3000. You are sent to **/login**, which links to **/setup** while no account exists.
Create your account there. Once it exists, the page closes. A second account is created from the Supabase dashboard ([guide](docs/DEPLOYMENT.md)).

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
| `npm run test:e2e` | Playwright end-to-end tests on a phone viewport (**resets the local DB**, builds the app) |
| `npm run icons` | Regenerate the PWA icons from the design in `scripts/generate-icons.mjs` |

## Deployment

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**: Supabase project and auth settings, Netlify
environment variables, first-run steps (create your account, then disable sign-ups), installing
the app on your phone, a pre-release checklist, backups and rollback.

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

- **Two accounts at most:** a `BEFORE INSERT` trigger on `auth.users` rejects any account beyond the second.
  Each account sees only its own data. The public `/setup` page closes after the first account.
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
9. `…_two_accounts.sql`: raises the account limit from one to two
10. `…_body_measurements.sql`: private dated body measurements

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
- **Progression hints** (planned exercises): double progression from your own last session. Once
  every target set reaches the top of the rep range, it suggests 2.5 kg more at the bottom of the
  range; otherwise it suggests the same weight and one more rep. Nothing is logged until you tap
  *Use* and then complete the set yourself.
- **Warm-ups**: *Add warm-up sets* in an exercise's menu adds 50%, 70% and 85% of the weight you
  typed, the suggested weight or last time's top weight, rounded down to 2.5 kg (one set under 30 kg).
- **Rest timer** starts after each completed working set (plan rest time, else 90 s), with
  −15/+15/skip. When it ends: your chosen sound (six built-in tones in Settings), vibration and, while the app is in the background, an optional
  notification (Settings). The screen stays on during rest. Browsers pause apps on a locked phone,
  so an alert can arrive late if you lock it yourself; iPhones need the app on the Home Screen for
  notifications, ignore vibration, and mute the sound with the silent switch.
- **Saving**: every change is written to an on-device draft instantly and autosaved to Supabase
  after a short pause, retried while offline and when the connection returns. Saves are full,
  idempotent snapshots with client-generated ids, so retries never duplicate sets.
- **Skip exercise** (exercise ⋮ menu) explains what skipping costs before anything changes: that it only affects
  today, which other exercises still train the same main muscle, and the volume it added last time. Confirming
  removes it from this workout, with Undo. The plan isn't changed.
- While a workout is running, the dashboard offers **Resume** instead of **Start**, since only one can run at a time.
- **Finish** drops unfinished rows and empty exercises and renumbers sets. **Discard** deletes
  the in-progress workout.
- **History** (`/history`) lists completed workouts by month. Each workout shows its sets, notes,
  totals, est. 1RM (labelled as an estimate) and a comparison with the previous time each exercise
  was trained. Workouts can be edited (sets, exercises, notes, start time, duration) or deleted.

## Exercise swapping

- **In a workout:** every exercise has a Swap button. The panel suggests alternatives from the library's own
  classifications (`features/exercises/alternatives.ts`): same main muscle first, then the same kind of movement,
  category and shared secondary muscles. The whole library is searchable and can be filtered by muscle and equipment.
- **Nothing logged yet:** the replacement takes the slot, keeping order, set and rep targets, rest and note. Weights
  are never copied; the replacement shows its own last performance.
- **Sets already completed:** they stay with the original exercise. The replacement is added after it for the
  remaining sets, so volume and records always belong to the exercise that was performed.
- **This workout only** is the default. **Also update my plan** changes the saved plan day; finished workouts keep
  the exercise they were logged with. The planner has the same Swap button on every exercise.
- Targets of a workout-only swap are remembered on the device, since the plan still lists the original.

## Design system

Tokens live in `src/app/globals.css`: a three-level dark surface scale, purple as an accent only, and a 4 px radius.
Type: Barlow Condensed for headings, Inter for interface text, IBM Plex Mono for every number (anything with
`tabular-nums`). Sections are separated by hairline rules and labelled headings (`Panel`), figures sit in a ruled
`StatStrip`, and lists are ruled rows rather than cards. `cta` and `eyebrow` are the two custom text utilities.

## Rest alerts

- **Sound** plays when a rest ends while FitTrack is open. Audio unlocks on a completed tap, as iOS requires.
  Settings has an option to play through the iPhone's silent switch, which may stop other audio.
- **Notifications** work in the background and on the lock screen through Web Push, because iOS freezes a web app's
  own timers. Starting a rest stores a row in `rest_alerts`, and `/api/rest-alert` starts a Netlify background function
  (`netlify/functions/rest-alert.mts`) that waits until the rest ends and sends the push. A normal function stops after 60 seconds. Skipping or changing the rest replaces or removes the row, so outdated alerts aren't sent. While the app is on screen the
  alert is cancelled 5 seconds before the rest ends, so you only get the sound. The row is gone once
  the alert is sent. No service-role key is needed.
- **Limits:** rests up to 14 minutes, because background functions stop at 15. Notifications use the phone's own
  sound. On iPhone they need iOS 16.4 or later and FitTrack on the Home Screen.

## Workout summary

Finishing a workout opens its summary (`/workouts/[id]?completed=1`). History shows the same screen and
components at `/workouts/[id]`, with Edit and Delete and the exercises expanded.

- **Calculated when read, from saved data** (`features/workouts/summary.ts`, loaded by `getWorkoutSummary`),
  so nothing extra is stored, refreshing is safe, and later edits are reflected. No migration was needed;
  notes use `workout_sessions.notes`.
- **Stats** count completed working sets. Warm-ups are listed but excluded, as everywhere else.
- **Personal records** compare with everything logged before that workout, in the same way as the finish
  notification, so a first-ever value isn't called a record. An estimated 1RM is always labelled as an estimate.
- **Comparison** uses the most recent earlier workout from the same plan day or with the same name. Workouts
  still called the default "Workout" aren't compared by name, because the name says nothing about their content.
- **Muscle groups** use the Progress page's convention: main muscles count fully, secondary muscles as half.
- **Repeat Workout** goes through the normal start flow and leaves the finished workout untouched. A workout
  already in progress is opened instead.
- **Finishing is safe to retry.** Autosave stops during a finish, a second tap is ignored, and a retry after a
  lost response opens the summary without saving over the finished workout.

## Body measurements

The **Body** tab (`/body`) logs height, weight, body fat and sizes (neck, shoulders, chest, biceps,
forearms, waist, hips, quads, calves). Every field is optional and there is one entry per day: logging
twice on a date merges into that entry. It shows each metric's latest value and change since it was
last logged, a trend chart per metric with range filters, and an editable history. Data is private to
the account and included in the JSON backup.

## Progress and personal records

- **Progress** (`/progress`): workouts, volume, working sets and average duration for a range
  (7 days, 30 days, 3 months, 6 months, all time), each compared with the previous equal period;
  weekly (12 weeks) and monthly (12 months) volume charts; and every trained exercise with its
  heaviest top set (actual), best est. 1RM (estimated) and change between first and last session.
- **Exercise progression** (`/progress/exercises/[id]`): all-time records, a per-session chart
  (top set weight, est. 1RM, volume or most reps; estimates drawn dashed and labelled), range
  filters and a session table linking to each workout.
- **Sets per muscle group** (`/progress`): completed working sets for the selected range, averaged
  per week (a total for 7 days), plus muscles not trained. A set counts fully for the main muscle
  and as half for secondary muscles.
- **Personal records** (`/progress/records`): heaviest weight, most reps (single set) and best
  est. 1RM per exercise with the date achieved. Records are rebuilt from your sets whenever a
  workout is finished, edited or deleted, so they are never duplicated or stale. Finishing a
  workout announces records it beat (a first-ever log is not announced); sets holding a record
  carry a PR badge in the workout view.

## Exporting your data

Settings → *Your data* downloads your data (`/api/export`, signed-in only, never cached):

- **CSV:** one row per completed set of completed workouts, for Excel or Google Sheets. Text that a
  spreadsheet would run as a formula is neutralised.
- **JSON:** a full backup of every table you can access: workouts, plans, custom exercises, records, body measurements.

The Supabase free plan has no automatic backups, so download one regularly. There is no import yet.

## Installable app (PWA) and offline use

- Installable on iPhone (Safari → *Add to Home Screen*), Android and desktop Chrome/Edge.
  Manifest: `src/app/manifest.ts`; icons generated by `npm run icons`.
- `public/sw.js` (registered in production builds only):
  - hashed app assets: cache-first;
  - pages: network-first, keeping the last good copy, so a page you already opened, such as a
    workout in progress, still loads on a dropped connection. The tracker then restores your
    latest sets from its on-device draft and syncs when the connection returns;
  - anything else falls back to an offline page (`/offline`).
- It never intercepts Supabase or Server Action requests. Signing out deletes its caches.
- Sessions persist across app restarts (Supabase refresh-token cookies).

## Testing

| Layer | Command | Covers |
| --- | --- | --- |
| Unit (Vitest) | `npm test` | Statistics, dates/timezones, tracker state, progression and warm-ups, muscle volume, CSV export, search/filters, schemas, templates |
| Database | `npm run test:db` | RLS isolation between two real accounts, account limit, constraints, planner, tracking and record functions |
| End-to-end (Playwright) | `npm run test:e2e` | Setup, protected routes, logging a workout, reload safety, last-time hints, PRs, progression hints, warm-ups, rest alerts, muscle volume, body measurements, exports, progress, plans, offline, sign-out |

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
    offline/           offline fallback page (service worker)
    manifest.ts        PWA manifest
  components/
    ui/                shadcn/ui primitives
    forms/             form building blocks
    layout/            sidebar (desktop), header + bottom nav (mobile), page header
    charts/            bar and line charts (one measure at a time, table fallback)
    pwa/               service worker registration, connection status
    brand/             logo
  features/<domain>/   business logic per domain: actions.ts, queries.ts, schemas.ts, components/
                       (auth, dashboard, analytics, profile, exercises, planner, workouts, body, export)
  hooks/               client hooks (useFormAction: forms that keep values on errors)
  lib/                 supabase clients, env validation, utilities
  config/              route constants and navigation
  types/               generated database types
  proxy.ts             session refresh + route protection
public/sw.js           service worker
supabase/
  migrations/          versioned SQL
  tests/               database security tests
e2e/                   Playwright end-to-end tests
docs/DEPLOYMENT.md     deployment guide and release checklist
```

## Roadmap

1. ✅ Setup, database, authentication, security
2. ✅ Responsive UI shell and dashboard
3. ✅ Exercise library
4. ✅ Workout planner
5. ✅ Workout tracking and sessions
6. ✅ Progress analytics and personal records
7. ✅ PWA, testing, deployment
