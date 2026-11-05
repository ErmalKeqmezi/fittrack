-- Body measurements: one private entry per day, with every metric optional.

create table public.body_measurements (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  measured_on        date not null,
  height_cm          numeric(5, 2) check (height_cm between 50 and 272),
  weight_kg          numeric(5, 2) check (weight_kg between 20 and 500),
  body_fat_percent   numeric(4, 1) check (body_fat_percent between 1 and 75),
  neck_cm            numeric(5, 2) check (neck_cm between 5 and 300),
  shoulders_cm       numeric(5, 2) check (shoulders_cm between 5 and 300),
  chest_cm           numeric(5, 2) check (chest_cm between 5 and 300),
  biceps_cm          numeric(5, 2) check (biceps_cm between 5 and 300),
  forearms_cm        numeric(5, 2) check (forearms_cm between 5 and 300),
  waist_cm           numeric(5, 2) check (waist_cm between 5 and 300),
  hips_cm            numeric(5, 2) check (hips_cm between 5 and 300),
  quads_cm           numeric(5, 2) check (quads_cm between 5 and 300),
  calves_cm          numeric(5, 2) check (calves_cm between 5 and 300),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (user_id, measured_on),
  check (num_nonnulls(height_cm, weight_kg, body_fat_percent, neck_cm, shoulders_cm, chest_cm,
                      biceps_cm, forearms_cm, waist_cm, hips_cm, quads_cm, calves_cm) > 0)
);

create trigger body_measurements_set_updated_at
  before update on public.body_measurements
  for each row execute function public.set_updated_at();

alter table public.body_measurements enable row level security;

create policy "body_measurements: owner" on public.body_measurements
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.body_measurements from anon;
