-- Phase 5: workout tracking.
-- The tracker keeps the session on the client and saves full snapshots
-- (idempotent, client-generated ids), so retries after a dropped connection
-- are safe. All functions are SECURITY INVOKER: RLS still applies.

-- ---------------------------------------------------------------------------
-- Start (or resume) a workout. With a plan day, its exercises are copied in;
-- the session keeps its own names so later plan edits never change history.
-- ---------------------------------------------------------------------------
create or replace function public.start_workout_session(p_workout_day_id uuid default null)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session_id uuid;
  v_day record;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  -- Only one workout can be in progress; resume it instead of starting another.
  select id into v_session_id from public.workout_sessions where status = 'in_progress';
  if v_session_id is not null then
    return v_session_id;
  end if;

  if p_workout_day_id is null then
    insert into public.workout_sessions (name) values ('Workout') returning id into v_session_id;
    return v_session_id;
  end if;

  select id, plan_id, name, is_rest_day into v_day from public.workout_days where id = p_workout_day_id;
  if v_day.id is null then
    raise exception 'Day not found.' using errcode = 'P0002';
  end if;
  if v_day.is_rest_day then
    raise exception 'Rest days have no exercises to log.' using errcode = '22023';
  end if;

  insert into public.workout_sessions (name, plan_id, workout_day_id)
  values (v_day.name, v_day.plan_id, v_day.id)
  returning id into v_session_id;

  insert into public.session_exercises (session_id, exercise_id, exercise_name, position)
  select v_session_id, pe.exercise_id, e.name, row_number() over (order by pe.position) - 1
  from public.plan_exercises pe
  join public.exercises e on e.id = pe.exercise_id
  where pe.workout_day_id = v_day.id;

  return v_session_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Save a full snapshot of a session's exercises and sets.
-- p_exercises: [{ id, exercise_id, notes?, sets: [{ id, weight_kg, reps, rpe?,
--                 is_warmup, is_completed, notes? }] }]   (array order = position)
-- Rows missing from the snapshot are deleted. Exercise names are snapshotted
-- on first insert and never overwritten.
-- For completed sessions, every set is completed and the times may be edited.
-- ---------------------------------------------------------------------------
create or replace function public.save_workout_session(
  p_session_id uuid,
  p_name text,
  p_notes text,
  p_exercises jsonb,
  p_started_at timestamptz default null,
  p_ended_at timestamptz default null
)
returns timestamptz
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status text;
  v_exercise jsonb;
  v_set jsonb;
  v_exercise_index integer := 0;
  v_set_index integer;
  v_exercise_name text;
  v_session_exercise_id uuid;
  v_updated_at timestamptz;
begin
  select status into v_status from public.workout_sessions where id = p_session_id;
  if v_status is null then
    raise exception 'Workout not found.' using errcode = 'P0002';
  end if;
  if jsonb_typeof(p_exercises) <> 'array' or jsonb_array_length(p_exercises) > 30 then
    raise exception 'A workout can have at most 30 exercises.' using errcode = '22023';
  end if;

  update public.workout_sessions
  set name = btrim(p_name),
      notes = nullif(btrim(coalesce(p_notes, '')), ''),
      started_at = case when v_status = 'completed' and p_started_at is not null then p_started_at else started_at end,
      ended_at = case when v_status = 'completed' and p_ended_at is not null then p_ended_at else ended_at end
  where id = p_session_id
  returning updated_at into v_updated_at;

  -- Exercises removed from the snapshot (their sets cascade).
  delete from public.session_exercises
  where session_id = p_session_id
    and id not in (select (e ->> 'id')::uuid from jsonb_array_elements(p_exercises) e);

  for v_exercise in select * from jsonb_array_elements(p_exercises) loop
    v_session_exercise_id := (v_exercise ->> 'id')::uuid;

    if jsonb_array_length(coalesce(v_exercise -> 'sets', '[]')) > 50 then
      raise exception 'An exercise can have at most 50 sets.' using errcode = '22023';
    end if;

    if exists (select 1 from public.session_exercises where id = v_session_exercise_id) then
      update public.session_exercises
      set position = v_exercise_index,
          notes = nullif(btrim(coalesce(v_exercise ->> 'notes', '')), '')
      where id = v_session_exercise_id and session_id = p_session_id;
    else
      select name into v_exercise_name from public.exercises where id = (v_exercise ->> 'exercise_id')::uuid;
      if v_exercise_name is null then
        raise exception 'Exercise not found.' using errcode = '23503';
      end if;
      insert into public.session_exercises (id, session_id, exercise_id, exercise_name, position, notes)
      values (
        v_session_exercise_id,
        p_session_id,
        (v_exercise ->> 'exercise_id')::uuid,
        v_exercise_name,
        v_exercise_index,
        nullif(btrim(coalesce(v_exercise ->> 'notes', '')), '')
      );
    end if;

    delete from public.exercise_sets
    where session_exercise_id = v_session_exercise_id
      and id not in (select (s ->> 'id')::uuid from jsonb_array_elements(coalesce(v_exercise -> 'sets', '[]')) s);

    v_set_index := 1;
    for v_set in select * from jsonb_array_elements(coalesce(v_exercise -> 'sets', '[]')) loop
      insert into public.exercise_sets
        (id, session_exercise_id, set_number, weight_kg, reps, rpe, is_warmup, is_completed, notes)
      values (
        (v_set ->> 'id')::uuid,
        v_session_exercise_id,
        v_set_index,
        (v_set ->> 'weight_kg')::numeric,
        (v_set ->> 'reps')::smallint,
        (v_set ->> 'rpe')::numeric,
        coalesce((v_set ->> 'is_warmup')::boolean, false),
        v_status = 'completed' or coalesce((v_set ->> 'is_completed')::boolean, false),
        nullif(btrim(coalesce(v_set ->> 'notes', '')), '')
      )
      on conflict (id) do update
      set set_number = excluded.set_number,
          weight_kg = excluded.weight_kg,
          reps = excluded.reps,
          rpe = excluded.rpe,
          is_warmup = excluded.is_warmup,
          is_completed = excluded.is_completed,
          notes = excluded.notes
      where public.exercise_sets.session_exercise_id = excluded.session_exercise_id;
      v_set_index := v_set_index + 1;
    end loop;

    v_exercise_index := v_exercise_index + 1;
  end loop;

  return v_updated_at;
end;
$$;

-- ---------------------------------------------------------------------------
-- Finish: drop unfinished sets and empty exercises, renumber, complete.
-- ---------------------------------------------------------------------------
create or replace function public.finish_workout_session(p_session_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status text;
begin
  select status into v_status from public.workout_sessions where id = p_session_id;
  if v_status is null then
    raise exception 'Workout not found.' using errcode = 'P0002';
  end if;
  if v_status <> 'in_progress' then
    raise exception 'This workout is already finished.' using errcode = '22023';
  end if;

  delete from public.exercise_sets es
  using public.session_exercises se
  where es.session_exercise_id = se.id and se.session_id = p_session_id and not es.is_completed;

  delete from public.session_exercises se
  where se.session_id = p_session_id
    and not exists (select 1 from public.exercise_sets es where es.session_exercise_id = se.id);

  if not exists (select 1 from public.session_exercises where session_id = p_session_id) then
    raise exception 'Complete at least one set before finishing.' using errcode = '22023';
  end if;

  update public.session_exercises se
  set position = r.rn - 1
  from (select id, row_number() over (order by position) rn from public.session_exercises where session_id = p_session_id) r
  where se.id = r.id;

  update public.exercise_sets es
  set set_number = r.rn
  from (
    select es2.id, row_number() over (partition by es2.session_exercise_id order by es2.set_number) rn
    from public.exercise_sets es2
    join public.session_exercises se on se.id = es2.session_exercise_id
    where se.session_id = p_session_id
  ) r
  where es.id = r.id;

  update public.workout_sessions
  set status = 'completed', ended_at = greatest(now(), started_at)
  where id = p_session_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- The most recent completed sets for each exercise before a point in time.
-- ---------------------------------------------------------------------------
create or replace function public.get_previous_performance(
  p_exercise_ids uuid[],
  p_before timestamptz,
  p_exclude_session_id uuid default null
)
returns table (
  exercise_id uuid,
  session_id uuid,
  started_at timestamptz,
  set_number smallint,
  weight_kg numeric,
  reps smallint,
  rpe numeric,
  is_warmup boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  with latest as (
    select distinct on (se.exercise_id) se.id, se.exercise_id, ws.id as session_id, ws.started_at
    from public.session_exercises se
    join public.workout_sessions ws on ws.id = se.session_id
    where ws.status = 'completed'
      and se.exercise_id = any (p_exercise_ids)
      and ws.started_at < p_before
      and ws.id is distinct from p_exclude_session_id
      and exists (select 1 from public.exercise_sets es where es.session_exercise_id = se.id)
    order by se.exercise_id, ws.started_at desc
  )
  select l.exercise_id, l.session_id, l.started_at, es.set_number, es.weight_kg, es.reps, es.rpe, es.is_warmup
  from latest l
  join public.exercise_sets es on es.session_exercise_id = l.id
  order by l.exercise_id, es.set_number;
$$;

revoke all on function public.start_workout_session(uuid) from public, anon;
revoke all on function public.save_workout_session(uuid, text, text, jsonb, timestamptz, timestamptz) from public, anon;
revoke all on function public.finish_workout_session(uuid) from public, anon;
revoke all on function public.get_previous_performance(uuid[], timestamptz, uuid) from public, anon;
grant execute on function public.start_workout_session(uuid) to authenticated;
grant execute on function public.save_workout_session(uuid, text, text, jsonb, timestamptz, timestamptz) to authenticated;
grant execute on function public.finish_workout_session(uuid) to authenticated;
grant execute on function public.get_previous_performance(uuid[], timestamptz, uuid) to authenticated;
