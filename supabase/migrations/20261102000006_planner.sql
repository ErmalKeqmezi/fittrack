-- Phase 4: workout planner.
-- Multi-row changes (create from template, reorder, schedule changes) run as
-- single SECURITY INVOKER functions so they are atomic and still bound by RLS.

-- A weekday can be assigned to at most one day per plan.
create unique index workout_days_plan_weekday_key
  on public.workout_days (plan_id, weekday) where weekday is not null;

-- ---------------------------------------------------------------------------
-- Create a plan with its days and exercises in one transaction.
-- p_days: [{ name, weekday?, is_rest_day?, exercises: [{ exercise_id, target_sets,
--           target_reps_min, target_reps_max, rest_seconds? }] }]
-- ---------------------------------------------------------------------------
create or replace function public.create_workout_plan(
  p_name text,
  p_description text default null,
  p_template_key text default null,
  p_days jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_plan_id uuid;
  v_day_id uuid;
  v_day jsonb;
  v_exercise jsonb;
  v_day_index integer := 0;
  v_exercise_index integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if jsonb_typeof(p_days) <> 'array' or jsonb_array_length(p_days) > 14 then
    raise exception 'A plan can have at most 14 days.' using errcode = '22023';
  end if;

  insert into public.workout_plans (name, description, template_key)
  values (btrim(p_name), nullif(btrim(coalesce(p_description, '')), ''), p_template_key)
  returning id into v_plan_id;

  for v_day in select * from jsonb_array_elements(p_days) loop
    insert into public.workout_days (plan_id, name, position, weekday, is_rest_day)
    values (
      v_plan_id,
      btrim(v_day ->> 'name'),
      v_day_index,
      (v_day ->> 'weekday')::smallint,
      coalesce((v_day ->> 'is_rest_day')::boolean, false)
    )
    returning id into v_day_id;

    v_exercise_index := 0;
    if not coalesce((v_day ->> 'is_rest_day')::boolean, false) then
      if jsonb_array_length(coalesce(v_day -> 'exercises', '[]')) > 20 then
        raise exception 'A day can have at most 20 exercises.' using errcode = '22023';
      end if;
      for v_exercise in select * from jsonb_array_elements(coalesce(v_day -> 'exercises', '[]')) loop
        insert into public.plan_exercises
          (workout_day_id, exercise_id, position, target_sets, target_reps_min, target_reps_max, rest_seconds)
        values (
          v_day_id,
          (v_exercise ->> 'exercise_id')::uuid,
          v_exercise_index,
          (v_exercise ->> 'target_sets')::smallint,
          (v_exercise ->> 'target_reps_min')::smallint,
          (v_exercise ->> 'target_reps_max')::smallint,
          (v_exercise ->> 'rest_seconds')::smallint
        );
        v_exercise_index := v_exercise_index + 1;
      end loop;
    end if;

    v_day_index := v_day_index + 1;
  end loop;

  return v_plan_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Activate one plan (deactivating the others) or deactivate it.
-- ---------------------------------------------------------------------------
create or replace function public.set_active_plan(p_plan_id uuid, p_active boolean)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (select 1 from public.workout_plans where id = p_plan_id) then
    raise exception 'Plan not found.' using errcode = 'P0002';
  end if;

  if p_active then
    update public.workout_plans set is_active = false where is_active and id <> p_plan_id;
  end if;
  update public.workout_plans set is_active = p_active where id = p_plan_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Days
-- ---------------------------------------------------------------------------
create or replace function public.add_workout_day(
  p_plan_id uuid,
  p_name text,
  p_weekday smallint default null,
  p_is_rest_day boolean default false
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not exists (select 1 from public.workout_plans where id = p_plan_id) then
    raise exception 'Plan not found.' using errcode = 'P0002';
  end if;
  if (select count(*) from public.workout_days where plan_id = p_plan_id) >= 14 then
    raise exception 'A plan can have at most 14 days.' using errcode = '22023';
  end if;

  -- The weekday moves to the new day if another day had it.
  if p_weekday is not null then
    update public.workout_days set weekday = null where plan_id = p_plan_id and weekday = p_weekday;
  end if;

  insert into public.workout_days (plan_id, name, position, weekday, is_rest_day)
  values (
    p_plan_id,
    btrim(p_name),
    coalesce((select max(position) + 1 from public.workout_days where plan_id = p_plan_id), 0),
    p_weekday,
    p_is_rest_day
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.update_workout_day(
  p_day_id uuid,
  p_name text,
  p_weekday smallint,
  p_is_rest_day boolean,
  p_notes text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_plan_id uuid;
begin
  select plan_id into v_plan_id from public.workout_days where id = p_day_id;
  if v_plan_id is null then
    raise exception 'Day not found.' using errcode = 'P0002';
  end if;

  if p_weekday is not null then
    update public.workout_days set weekday = null
    where plan_id = v_plan_id and weekday = p_weekday and id <> p_day_id;
  end if;

  -- Rest days carry no exercises.
  if p_is_rest_day then
    delete from public.plan_exercises where workout_day_id = p_day_id;
  end if;

  update public.workout_days
  set name = btrim(p_name),
      weekday = p_weekday,
      is_rest_day = p_is_rest_day,
      notes = nullif(btrim(coalesce(p_notes, '')), '')
  where id = p_day_id;
end;
$$;

-- Swap a day with its neighbour (p_offset = -1 up, +1 down).
create or replace function public.move_workout_day(p_day_id uuid, p_offset integer)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_plan_id uuid;
  v_position smallint;
  v_other_id uuid;
  v_other_position smallint;
begin
  select plan_id, position into v_plan_id, v_position from public.workout_days where id = p_day_id;
  if v_plan_id is null then
    raise exception 'Day not found.' using errcode = 'P0002';
  end if;

  select id, position into v_other_id, v_other_position
  from public.workout_days
  where plan_id = v_plan_id
    and case when p_offset < 0 then position < v_position else position > v_position end
  order by case when p_offset < 0 then -position else position end
  limit 1;

  if v_other_id is null then
    return; -- already first/last
  end if;

  -- (plan_id, position) is unique DEFERRABLE, so the swap is checked at commit.
  update public.workout_days set position = v_other_position where id = p_day_id;
  update public.workout_days set position = v_position where id = v_other_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Exercises within a day
-- ---------------------------------------------------------------------------
create or replace function public.add_plan_exercise(
  p_day_id uuid,
  p_exercise_id uuid,
  p_target_sets smallint,
  p_target_reps_min smallint,
  p_target_reps_max smallint,
  p_rest_seconds smallint default null,
  p_notes text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_is_rest boolean;
  v_id uuid;
begin
  select is_rest_day into v_is_rest from public.workout_days where id = p_day_id;
  if v_is_rest is null then
    raise exception 'Day not found.' using errcode = 'P0002';
  end if;
  if v_is_rest then
    raise exception 'Rest days cannot have exercises.' using errcode = '22023';
  end if;
  if (select count(*) from public.plan_exercises where workout_day_id = p_day_id) >= 20 then
    raise exception 'A day can have at most 20 exercises.' using errcode = '22023';
  end if;

  insert into public.plan_exercises
    (workout_day_id, exercise_id, position, target_sets, target_reps_min, target_reps_max, rest_seconds, notes)
  values (
    p_day_id,
    p_exercise_id,
    coalesce((select max(position) + 1 from public.plan_exercises where workout_day_id = p_day_id), 0),
    p_target_sets,
    p_target_reps_min,
    p_target_reps_max,
    p_rest_seconds,
    nullif(btrim(coalesce(p_notes, '')), '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.move_plan_exercise(p_plan_exercise_id uuid, p_offset integer)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_day_id uuid;
  v_position smallint;
  v_other_id uuid;
  v_other_position smallint;
begin
  select workout_day_id, position into v_day_id, v_position
  from public.plan_exercises where id = p_plan_exercise_id;
  if v_day_id is null then
    raise exception 'Exercise not found.' using errcode = 'P0002';
  end if;

  select id, position into v_other_id, v_other_position
  from public.plan_exercises
  where workout_day_id = v_day_id
    and case when p_offset < 0 then position < v_position else position > v_position end
  order by case when p_offset < 0 then -position else position end
  limit 1;

  if v_other_id is null then
    return;
  end if;

  update public.plan_exercises set position = v_other_position where id = p_plan_exercise_id;
  update public.plan_exercises set position = v_position where id = v_other_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges: signed-in users only.
-- ---------------------------------------------------------------------------
revoke all on function public.create_workout_plan(text, text, text, jsonb) from public, anon;
revoke all on function public.set_active_plan(uuid, boolean) from public, anon;
revoke all on function public.add_workout_day(uuid, text, smallint, boolean) from public, anon;
revoke all on function public.update_workout_day(uuid, text, smallint, boolean, text) from public, anon;
revoke all on function public.move_workout_day(uuid, integer) from public, anon;
revoke all on function public.add_plan_exercise(uuid, uuid, smallint, smallint, smallint, smallint, text) from public, anon;
revoke all on function public.move_plan_exercise(uuid, integer) from public, anon;

grant execute on function public.create_workout_plan(text, text, text, jsonb) to authenticated;
grant execute on function public.set_active_plan(uuid, boolean) to authenticated;
grant execute on function public.add_workout_day(uuid, text, smallint, boolean) to authenticated;
grant execute on function public.update_workout_day(uuid, text, smallint, boolean, text) to authenticated;
grant execute on function public.move_workout_day(uuid, integer) to authenticated;
grant execute on function public.add_plan_exercise(uuid, uuid, smallint, smallint, smallint, smallint, text) to authenticated;
grant execute on function public.move_plan_exercise(uuid, integer) to authenticated;
