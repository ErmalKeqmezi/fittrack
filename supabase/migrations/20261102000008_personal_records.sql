-- Phase 6: personal records.
-- personal_records holds the current best per (exercise, record type), kept in
-- step with logged sets by recompute_personal_records(). Recomputing from the
-- sets (instead of appending) means saving or editing a workout can never
-- create duplicate or stale records.
-- Records use completed, non-warm-up sets of completed workouts only.
--   max_weight: heaviest weight (ties: more reps, then earliest)
--   max_reps:   most reps in one set (ties: heavier, then earliest)
--   best_e1rm:  best estimated 1RM, estimate_1rm() (ties: earliest)

create or replace function public.recompute_personal_records(p_exercise_ids uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$
  with logged as (
    select se.user_id, se.exercise_id, es.id as set_id, ws.id as session_id, ws.started_at,
           es.weight_kg, es.reps, public.estimate_1rm(es.weight_kg, es.reps) as e1rm
    from public.exercise_sets es
    join public.session_exercises se on se.id = es.session_exercise_id
    join public.workout_sessions ws on ws.id = se.session_id
    where ws.status = 'completed' and es.is_completed and not es.is_warmup
      and se.exercise_id = any (p_exercise_ids)
  ),
  candidates as (
    select user_id, exercise_id, 'max_weight' as record_type, weight_kg as value, weight_kg, reps,
           set_id, session_id, started_at, reps::numeric as tiebreak
    from logged where weight_kg > 0
    union all
    select user_id, exercise_id, 'max_reps', reps::numeric, weight_kg, reps,
           set_id, session_id, started_at, weight_kg
    from logged where reps > 0
    union all
    select user_id, exercise_id, 'best_e1rm', e1rm, weight_kg, reps,
           set_id, session_id, started_at, 0
    from logged where e1rm is not null
  ),
  best as (
    select distinct on (user_id, exercise_id, record_type) *
    from candidates
    order by user_id, exercise_id, record_type, value desc, tiebreak desc, started_at asc
  ),
  removed as (
    delete from public.personal_records pr
    where pr.exercise_id = any (p_exercise_ids)
      and not exists (
        select 1 from best b
        where b.user_id = pr.user_id and b.exercise_id = pr.exercise_id and b.record_type = pr.record_type
      )
    returning 1
  )
  insert into public.personal_records
    (user_id, exercise_id, record_type, value, weight_kg, reps, exercise_set_id, session_id, achieved_at)
  select user_id, exercise_id, record_type, value, weight_kg, reps, set_id, session_id, started_at
  from best
  on conflict (user_id, exercise_id, record_type) do update
  set value = excluded.value,
      weight_kg = excluded.weight_kg,
      reps = excluded.reps,
      exercise_set_id = excluded.exercise_set_id,
      session_id = excluded.session_id,
      achieved_at = excluded.achieved_at
  where (public.personal_records.value, public.personal_records.exercise_set_id, public.personal_records.achieved_at)
        is distinct from (excluded.value, excluded.exercise_set_id, excluded.achieved_at);
$$;

-- ---------------------------------------------------------------------------
-- save_workout_session: unchanged, plus a records recompute when a completed
-- workout is edited.
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
  v_touched uuid[];
begin
  select status into v_status from public.workout_sessions where id = p_session_id;
  if v_status is null then
    raise exception 'Workout not found.' using errcode = 'P0002';
  end if;
  if jsonb_typeof(p_exercises) <> 'array' or jsonb_array_length(p_exercises) > 30 then
    raise exception 'A workout can have at most 30 exercises.' using errcode = '22023';
  end if;

  -- Exercises before and after this save; their records may change.
  select coalesce(array_agg(distinct exercise_id), '{}') into v_touched
  from public.session_exercises where session_id = p_session_id;
  v_touched := v_touched || coalesce(
    (select array_agg((e ->> 'exercise_id')::uuid) from jsonb_array_elements(p_exercises) e), '{}');

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

  if v_status = 'completed' then
    perform public.recompute_personal_records(v_touched);
  end if;

  return v_updated_at;
end;
$$;

-- ---------------------------------------------------------------------------
-- finish_workout_session now returns the records this workout improved.
-- ---------------------------------------------------------------------------
drop function public.finish_workout_session(uuid);

create function public.finish_workout_session(p_session_id uuid)
returns table (
  exercise_id uuid,
  exercise_name text,
  record_type text,
  value numeric,
  weight_kg numeric,
  reps smallint,
  previous_value numeric
)
language plpgsql
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_status text;
  v_exercise_ids uuid[];
  v_old jsonb;
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

  select array_agg(distinct exercise_id) into v_exercise_ids
  from public.session_exercises where session_id = p_session_id;

  -- Records as they stood before this workout, to report improvements.
  select coalesce(jsonb_agg(jsonb_build_object('exercise_id', pr.exercise_id, 'record_type', pr.record_type, 'value', pr.value)), '[]')
  into v_old
  from public.personal_records pr
  where pr.exercise_id = any (v_exercise_ids);

  perform public.recompute_personal_records(v_exercise_ids);

  -- Only beats of an existing record count as "new"; a first-ever log is not reported.
  return query
  select pr.exercise_id, se.exercise_name, pr.record_type, pr.value, pr.weight_kg, pr.reps, o.value
  from public.personal_records pr
  join jsonb_to_recordset(v_old) as o(exercise_id uuid, record_type text, value numeric)
    on o.exercise_id = pr.exercise_id and o.record_type = pr.record_type
  join lateral (
    select s.exercise_name from public.session_exercises s
    where s.session_id = p_session_id and s.exercise_id = pr.exercise_id limit 1
  ) se on true
  where pr.session_id = p_session_id and pr.value > o.value
  order by se.exercise_name, pr.record_type;
end;
$$;


-- ---------------------------------------------------------------------------
-- Delete a completed workout and refresh the affected records.
-- ---------------------------------------------------------------------------
create or replace function public.delete_workout_session(p_session_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_exercise_ids uuid[];
begin
  select array_agg(distinct exercise_id) into v_exercise_ids
  from public.session_exercises where session_id = p_session_id;

  delete from public.workout_sessions where id = p_session_id and status = 'completed';
  if not found then
    raise exception 'Workout not found.' using errcode = 'P0002';
  end if;

  perform public.recompute_personal_records(coalesce(v_exercise_ids, '{}'));
end;
$$;

revoke all on function public.recompute_personal_records(uuid[]) from public, anon;
revoke all on function public.finish_workout_session(uuid) from public, anon;
revoke all on function public.delete_workout_session(uuid) from public, anon;
grant execute on function public.recompute_personal_records(uuid[]) to authenticated;
grant execute on function public.finish_workout_session(uuid) to authenticated;
grant execute on function public.delete_workout_session(uuid) to authenticated;

-- Backfill records for workouts logged before this migration.
select public.recompute_personal_records(array(select distinct exercise_id from public.session_exercises));
