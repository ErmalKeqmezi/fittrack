-- FitTrack authentication guard and Row Level Security

-- ---------------------------------------------------------------------------
-- Single-account guard
-- FitTrack is a private journal: the first sign-up becomes the owner and every
-- later sign-up is rejected by the database, regardless of dashboard settings.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_single_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from auth.users) then
    raise exception 'FitTrack already has an owner account. Registration is closed.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger fittrack_single_account
  before insert on auth.users
  for each row execute function public.enforce_single_account();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '')
  );
  return new;
end;
$$;

create trigger fittrack_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Lets the login screen know whether to offer first-time setup.
-- Returns only a boolean; it exposes no account data.
create or replace function public.is_setup_complete()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from auth.users);
$$;

revoke all on function public.is_setup_complete() from public;
grant execute on function public.is_setup_complete() to anon, authenticated;

revoke all on function public.enforce_single_account() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Table privileges: anonymous visitors get nothing.
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;

-- Reference data is read-only for the signed-in user.
revoke insert, update, delete on public.muscle_groups from authenticated;
-- Profiles are created by trigger only and removed with the auth user.
revoke insert, delete on public.profiles from authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles                  enable row level security;
alter table public.muscle_groups             enable row level security;
alter table public.exercises                 enable row level security;
alter table public.exercise_secondary_muscles enable row level security;
alter table public.workout_plans             enable row level security;
alter table public.workout_days              enable row level security;
alter table public.plan_exercises            enable row level security;
alter table public.workout_sessions          enable row level security;
alter table public.session_exercises         enable row level security;
alter table public.exercise_sets             enable row level security;
alter table public.personal_records          enable row level security;

-- profiles
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- muscle_groups
create policy "muscle_groups: read" on public.muscle_groups
  for select to authenticated using (true);

-- exercises: built-ins are readable, custom ones are private
create policy "exercises: read built-in and own" on public.exercises
  for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));
create policy "exercises: insert own" on public.exercises
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "exercises: update own" on public.exercises
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "exercises: delete own" on public.exercises
  for delete to authenticated using (user_id = (select auth.uid()));

-- exercise_secondary_muscles: follow the parent exercise
create policy "secondary_muscles: read visible" on public.exercise_secondary_muscles
  for select to authenticated
  using (exists (select 1 from public.exercises e where e.id = exercise_id));
create policy "secondary_muscles: insert own" on public.exercise_secondary_muscles
  for insert to authenticated
  with check (exists (select 1 from public.exercises e
                      where e.id = exercise_id and e.user_id = (select auth.uid())));
create policy "secondary_muscles: delete own" on public.exercise_secondary_muscles
  for delete to authenticated
  using (exists (select 1 from public.exercises e
                 where e.id = exercise_id and e.user_id = (select auth.uid())));

-- workout_plans / workout_days: owner only
create policy "workout_plans: owner" on public.workout_plans
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "workout_days: owner" on public.workout_days
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- plan_exercises: owner only, and the exercise must be visible to the owner
create policy "plan_exercises: owner" on public.plan_exercises
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.exercises e where e.id = exercise_id)
  );

-- workout_sessions: owner only; linked plan/day must also be the owner's
create policy "workout_sessions: owner" on public.workout_sessions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (plan_id is null or exists (select 1 from public.workout_plans p where p.id = plan_id))
    and (workout_day_id is null or exists (select 1 from public.workout_days d where d.id = workout_day_id))
  );

create policy "session_exercises: owner" on public.session_exercises
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.exercises e where e.id = exercise_id)
  );

create policy "exercise_sets: owner" on public.exercise_sets
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "personal_records: owner" on public.personal_records
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.exercises e where e.id = exercise_id)
  );
