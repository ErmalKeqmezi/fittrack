-- Phase 3: atomic create/update of custom exercises with their secondary muscles.
-- SECURITY INVOKER: runs as the signed-in user, so RLS still applies.

-- p_exercise_id null creates a new exercise; otherwise updates that one.
create or replace function public.save_custom_exercise(
  p_name text,
  p_description text,
  p_primary_muscle_group_id smallint,
  p_secondary_muscle_group_ids smallint[],
  p_equipment text,
  p_category text,
  p_exercise_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text := btrim(p_name);
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  -- A custom exercise may not shadow a built-in one.
  if exists (
    select 1 from public.exercises
    where user_id is null and lower(name) = lower(v_name)
  ) then
    raise exception 'A built-in exercise named "%" already exists.', v_name using errcode = '23505';
  end if;

  if p_exercise_id is null then
    insert into public.exercises (user_id, name, description, primary_muscle_group_id, equipment, category)
    values (v_user_id, v_name, nullif(btrim(p_description), ''), p_primary_muscle_group_id, p_equipment, p_category)
    returning id into v_id;
  else
    update public.exercises
    set name = v_name,
        description = nullif(btrim(p_description), ''),
        primary_muscle_group_id = p_primary_muscle_group_id,
        equipment = p_equipment,
        category = p_category
    where id = p_exercise_id and user_id = v_user_id
    returning id into v_id;

    if v_id is null then
      raise exception 'Custom exercise not found.' using errcode = 'P0002';
    end if;
  end if;

  delete from public.exercise_secondary_muscles where exercise_id = v_id;

  insert into public.exercise_secondary_muscles (exercise_id, muscle_group_id)
  select distinct v_id, mg_id
  from unnest(coalesce(p_secondary_muscle_group_ids, '{}')) as mg_id
  where mg_id <> p_primary_muscle_group_id;

  return v_id;
end;
$$;

revoke all on function public.save_custom_exercise(text, text, smallint, smallint[], text, text, uuid) from public, anon;
grant execute on function public.save_custom_exercise(text, text, smallint, smallint[], text, text, uuid) to authenticated;

-- Library gap: no built-in exercise targeted forearms first.
with seed (name, description, primary_slug, secondary_slugs, equipment, category) as (
  values
  ('Wrist Curl', 'Forearms on a bench, palms up, curl the weight with the wrists only.', 'forearms', null, 'barbell', 'isolation'),
  ('Reverse Curl', 'Curl with a pronated (palms-down) grip.', 'forearms', 'biceps', 'ez_bar', 'isolation'),
  ('Farmer''s Carry', 'Walk with heavy dumbbells at your sides. Log distance or seconds as reps.', 'forearms', 'traps,abs', 'dumbbell', 'compound')
),
inserted as (
  insert into public.exercises (name, description, primary_muscle_group_id, equipment, category)
  select s.name, s.description, mg.id, s.equipment, s.category
  from seed s
  join public.muscle_groups mg on mg.slug = s.primary_slug
  returning id, name
)
insert into public.exercise_secondary_muscles (exercise_id, muscle_group_id)
select i.id, mg.id
from inserted i
join seed s on s.name = i.name
cross join lateral unnest(string_to_array(s.secondary_slugs, ',')) as secondary(slug)
join public.muscle_groups mg on mg.slug = secondary.slug;
