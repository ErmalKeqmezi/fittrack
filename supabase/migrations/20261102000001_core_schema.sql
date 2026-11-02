-- FitTrack core schema
-- Every private row carries user_id = auth.uid(). Child tables reference their
-- parent through a composite (id, user_id) foreign key, so a row can never point
-- at a parent owned by a different account, even if a policy were misconfigured.

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user (FitTrack is single-user by design)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text check (display_name is null or char_length(display_name) between 1 and 60),
  weight_unit   text not null default 'kg' check (weight_unit in ('kg')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- muscle_groups: global reference data (read-only for users)
-- ---------------------------------------------------------------------------

create table public.muscle_groups (
  id           smallint generated always as identity primary key,
  slug         text not null unique check (slug ~ '^[a-z_]+$'),
  name         text not null unique,
  body_region  text not null check (body_region in
                 ('chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'legs', 'core')),
  sort_order   smallint not null default 0
);

-- ---------------------------------------------------------------------------
-- exercises: built-in (user_id is null) and custom (user_id = owner)
-- ---------------------------------------------------------------------------

create table public.exercises (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid references public.profiles (id) on delete cascade,
  name                      text not null check (char_length(btrim(name)) between 2 and 80),
  description               text check (description is null or char_length(description) <= 1000),
  primary_muscle_group_id   smallint not null references public.muscle_groups (id),
  equipment                 text not null check (equipment in
                              ('barbell', 'dumbbell', 'machine', 'cable', 'bodyweight',
                               'kettlebell', 'smith_machine', 'ez_bar', 'band', 'other')),
  category                  text not null check (category in ('compound', 'isolation')),
  is_archived               boolean not null default false,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- Names are unique among built-ins, and unique per user among custom exercises.
create unique index exercises_builtin_name_key
  on public.exercises (lower(name)) where user_id is null;
create unique index exercises_user_name_key
  on public.exercises (user_id, lower(name)) where user_id is not null;
create index exercises_primary_muscle_idx on public.exercises (primary_muscle_group_id);

create trigger exercises_set_updated_at
  before update on public.exercises
  for each row execute function public.set_updated_at();

-- Secondary muscles (many-to-many)
create table public.exercise_secondary_muscles (
  exercise_id      uuid not null references public.exercises (id) on delete cascade,
  muscle_group_id  smallint not null references public.muscle_groups (id),
  primary key (exercise_id, muscle_group_id)
);

create index exercise_secondary_muscles_muscle_idx
  on public.exercise_secondary_muscles (muscle_group_id);

-- ---------------------------------------------------------------------------
-- Planner: workout_plans -> workout_days -> plan_exercises
-- ---------------------------------------------------------------------------

create table public.workout_plans (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name         text not null check (char_length(btrim(name)) between 1 and 80),
  description  text check (description is null or char_length(description) <= 1000),
  is_active    boolean not null default false,
  template_key text check (template_key is null or template_key in
                 ('arnold_split', 'push_pull_legs', 'upper_lower', 'full_body')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (id, user_id)
);

-- At most one active plan per user (drives "today's scheduled workout").
create unique index workout_plans_one_active_per_user
  on public.workout_plans (user_id) where is_active;
create index workout_plans_user_idx on public.workout_plans (user_id, created_at desc);

create trigger workout_plans_set_updated_at
  before update on public.workout_plans
  for each row execute function public.set_updated_at();

create table public.workout_days (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid(),
  plan_id      uuid not null,
  name         text not null check (char_length(btrim(name)) between 1 and 60),
  position     smallint not null check (position >= 0),
  -- ISO weekday (1 = Monday … 7 = Sunday); null means "unscheduled / rotate"
  weekday      smallint check (weekday between 1 and 7),
  is_rest_day  boolean not null default false,
  notes        text check (notes is null or char_length(notes) <= 1000),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (id, user_id),
  unique (plan_id, position) deferrable initially deferred,
  foreign key (plan_id, user_id) references public.workout_plans (id, user_id) on delete cascade
);

create index workout_days_user_idx on public.workout_days (user_id);

create trigger workout_days_set_updated_at
  before update on public.workout_days
  for each row execute function public.set_updated_at();

create table public.plan_exercises (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid(),
  workout_day_id   uuid not null,
  exercise_id      uuid not null references public.exercises (id) on delete restrict,
  position         smallint not null check (position >= 0),
  target_sets      smallint not null check (target_sets between 1 and 20),
  target_reps_min  smallint not null check (target_reps_min between 1 and 100),
  target_reps_max  smallint not null check (target_reps_max between 1 and 100),
  target_rpe       numeric(3, 1) check (target_rpe is null or target_rpe between 1 and 10),
  rest_seconds     smallint check (rest_seconds is null or rest_seconds between 0 and 900),
  notes            text check (notes is null or char_length(notes) <= 500),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (target_reps_max >= target_reps_min),
  unique (workout_day_id, position) deferrable initially deferred,
  foreign key (workout_day_id, user_id) references public.workout_days (id, user_id) on delete cascade
);

create index plan_exercises_user_idx on public.plan_exercises (user_id);
create index plan_exercises_exercise_idx on public.plan_exercises (exercise_id);

create trigger plan_exercises_set_updated_at
  before update on public.plan_exercises
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Tracking: workout_sessions -> session_exercises -> exercise_sets
-- Sessions snapshot names so history is independent of later plan edits.
-- ---------------------------------------------------------------------------

create table public.workout_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  plan_id         uuid references public.workout_plans (id) on delete set null,
  workout_day_id  uuid references public.workout_days (id) on delete set null,
  name            text not null check (char_length(btrim(name)) between 1 and 80),
  status          text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  started_at      timestamptz not null default now(),
  ended_at        timestamptz,
  notes           text check (notes is null or char_length(notes) <= 2000),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (id, user_id),
  check (ended_at is null or ended_at >= started_at),
  check ((status = 'completed') = (ended_at is not null))
);

-- Only one workout can be in progress at a time.
create unique index workout_sessions_one_in_progress
  on public.workout_sessions (user_id) where status = 'in_progress';
create index workout_sessions_user_started_idx
  on public.workout_sessions (user_id, started_at desc);

create trigger workout_sessions_set_updated_at
  before update on public.workout_sessions
  for each row execute function public.set_updated_at();

create table public.session_exercises (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid(),
  session_id     uuid not null,
  exercise_id    uuid not null references public.exercises (id) on delete restrict,
  exercise_name  text not null,  -- snapshot at the time of the workout
  position       smallint not null check (position >= 0),
  notes          text check (notes is null or char_length(notes) <= 1000),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (id, user_id),
  unique (session_id, position) deferrable initially deferred,
  foreign key (session_id, user_id) references public.workout_sessions (id, user_id) on delete cascade
);

create index session_exercises_user_exercise_idx
  on public.session_exercises (user_id, exercise_id);

create trigger session_exercises_set_updated_at
  before update on public.session_exercises
  for each row execute function public.set_updated_at();

create table public.exercise_sets (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null default auth.uid(),
  session_exercise_id  uuid not null,
  set_number           smallint not null check (set_number between 1 and 50),
  weight_kg            numeric(6, 2) not null check (weight_kg between 0 and 1000),
  reps                 smallint not null check (reps between 0 and 200),
  rpe                  numeric(3, 1) check (rpe is null or (rpe between 1 and 10 and rpe * 2 = round(rpe * 2))),
  is_warmup            boolean not null default false,
  is_completed         boolean not null default true,
  notes                text check (notes is null or char_length(notes) <= 500),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (session_exercise_id, set_number) deferrable initially deferred,
  foreign key (session_exercise_id, user_id) references public.session_exercises (id, user_id) on delete cascade
);

create index exercise_sets_user_idx on public.exercise_sets (user_id);

create trigger exercise_sets_set_updated_at
  before update on public.exercise_sets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- personal_records: the current best per (exercise, record type).
-- The unique key prevents duplicates; Phase 6 recomputes these from
-- exercise_sets whenever a session is saved or edited.
-- ---------------------------------------------------------------------------

create table public.personal_records (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  exercise_id     uuid not null references public.exercises (id) on delete cascade,
  record_type     text not null check (record_type in ('max_weight', 'max_reps', 'best_e1rm')),
  value           numeric(7, 2) not null check (value >= 0),
  weight_kg       numeric(6, 2) not null check (weight_kg >= 0),
  reps            smallint not null check (reps >= 0),
  exercise_set_id uuid references public.exercise_sets (id) on delete set null,
  session_id      uuid references public.workout_sessions (id) on delete set null,
  achieved_at     timestamptz not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, exercise_id, record_type)
);

create index personal_records_user_achieved_idx
  on public.personal_records (user_id, achieved_at desc);

create trigger personal_records_set_updated_at
  before update on public.personal_records
  for each row execute function public.set_updated_at();
