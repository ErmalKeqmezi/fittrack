-- Phase 2: profile timezone and read-only summary views for the dashboard.
-- Views use security_invoker so Row Level Security of the underlying tables applies.

-- ---------------------------------------------------------------------------
-- Profile timezone (used to bucket workouts into local days and weeks)
-- ---------------------------------------------------------------------------

create or replace function public.is_valid_timezone(tz text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from pg_catalog.pg_timezone_names where name = tz);
$$;

alter table public.profiles
  add column timezone text not null default 'UTC'
  constraint profiles_timezone_valid check (public.is_valid_timezone(timezone));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_tz text := new.raw_user_meta_data ->> 'timezone';
begin
  insert into public.profiles (id, display_name, timezone)
  values (
    new.id,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), ''),
    case when public.is_valid_timezone(requested_tz) then requested_tz else 'UTC' end
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Estimated one-rep max (Epley). Only reps 1–12 give a meaningful estimate;
-- higher rep sets return null. Mirrored in src/features/analytics/calculations.ts.
-- ---------------------------------------------------------------------------

create or replace function public.estimate_1rm(weight_kg numeric, reps integer)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case
    when weight_kg is null or reps is null or reps < 1 or reps > 12 or weight_kg <= 0 then null
    when reps = 1 then round(weight_kg, 2)
    else round(weight_kg * (1 + reps / 30.0), 2)
  end;
$$;

-- ---------------------------------------------------------------------------
-- session_summaries: one row per workout session with its totals.
-- Volume and set counts only include completed, non-warm-up sets.
-- ---------------------------------------------------------------------------

create view public.session_summaries
with (security_invoker = true) as
select
  ws.id,
  ws.user_id,
  ws.name,
  ws.status,
  ws.plan_id,
  ws.workout_day_id,
  ws.started_at,
  ws.ended_at,
  count(distinct se.id)::integer as exercise_count,
  (count(es.id) filter (where es.is_completed and not es.is_warmup))::integer as working_set_count,
  coalesce(sum(es.weight_kg * es.reps) filter (where es.is_completed and not es.is_warmup), 0)::numeric(12, 2)
    as volume_kg
from public.workout_sessions ws
left join public.session_exercises se on se.session_id = ws.id
left join public.exercise_sets es on es.session_exercise_id = se.id
group by ws.id;

-- ---------------------------------------------------------------------------
-- exercise_session_bests: per exercise per completed session, the actual top
-- set and the best estimated 1RM, kept as separate columns.
-- ---------------------------------------------------------------------------

create view public.exercise_session_bests
with (security_invoker = true) as
select
  se.id as session_exercise_id,
  se.user_id,
  se.exercise_id,
  se.exercise_name,
  ws.id as session_id,
  ws.started_at,
  max(es.weight_kg) as top_weight_kg,
  (array_agg(es.reps order by es.weight_kg desc, es.reps desc))[1]::integer as top_weight_reps,
  max(es.reps)::integer as max_reps,
  max(public.estimate_1rm(es.weight_kg, es.reps)) as best_e1rm_kg,
  sum(es.weight_kg * es.reps)::numeric(12, 2) as volume_kg,
  count(es.id)::integer as working_set_count
from public.session_exercises se
join public.workout_sessions ws on ws.id = se.session_id and ws.status = 'completed'
join public.exercise_sets es on es.session_exercise_id = se.id and es.is_completed and not es.is_warmup
group by se.id, ws.id;

revoke all on public.session_summaries, public.exercise_session_bests from anon;
grant select on public.session_summaries, public.exercise_session_bests to authenticated;

