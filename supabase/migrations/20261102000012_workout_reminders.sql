-- Daily workout reminder: a push notification at a time each user picks.
--
-- A scheduled function asks the database who is due, every few minutes. It has
-- no user session and FitTrack never uses the service-role key, so it proves
-- itself with a secret instead. Only a hash of that secret is stored, in a
-- schema the API can't reach.

-- 1. The user's choice, on their profile (updated under the existing "update own" policy).
alter table public.profiles
  add column workout_reminder_enabled boolean not null default false,
  add column workout_reminder_time time not null default '18:00',
  add column workout_reminder_last_sent date;

-- 2. Devices that accept notifications. One row per browser or installed app.
create table public.push_subscriptions (
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  endpoint   text not null check (char_length(endpoint) <= 2048),
  p256dh     text not null check (char_length(p256dh) <= 256),
  auth       text not null check (char_length(auth) <= 256),
  created_at timestamptz not null default now(),
  primary key (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions: owner" on public.push_subscriptions
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.push_subscriptions from anon;

-- 3. Secrets for scheduled jobs, kept out of the API.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.job_secrets (
  name   text primary key,
  sha256 bytea not null
);
revoke all on private.job_secrets from public, anon, authenticated;

-- Run once in the Supabase SQL editor with the same value as WORKOUT_REMINDER_SECRET:
--   select public.set_job_secret('workout_reminders', '<the secret>');
create or replace function public.set_job_secret(p_name text, p_secret text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into private.job_secrets (name, sha256)
  values (p_name, extensions.digest(p_secret, 'sha256'))
  on conflict (name) do update set sha256 = excluded.sha256;
$$;
revoke execute on function public.set_job_secret(text, text) from public, anon, authenticated;

create or replace function private.job_secret_ok(p_name text, p_secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(char_length(p_secret) >= 32, false) and exists (
    select 1 from private.job_secrets
    where name = p_name and sha256 = extensions.digest(p_secret, 'sha256')
  );
$$;
revoke execute on function private.job_secret_ok(text, text) from public, anon, authenticated;

-- 4. Who gets a reminder now: reminders on, the chosen local time has passed
--    (by at most 3 hours, so a late run doesn't remind at midnight), not yet sent
--    today, and no workout started today. Marks them sent and returns their devices.
create or replace function public.claim_workout_reminders(p_secret text)
returns table (user_id uuid, display_name text, endpoint text, p256dh text, auth text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.job_secret_ok('workout_reminders', p_secret) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return query
  with local as (
    select p.id,
           p.display_name,
           (now() at time zone p.timezone)::date as today,
           (now() at time zone p.timezone)::time - p.workout_reminder_time as late_by
    from public.profiles p
    where p.workout_reminder_enabled
  ),
  due as (
    select l.id, l.display_name, l.today
    from local l
    where l.late_by >= interval '0' and l.late_by < interval '3 hours'
      and not exists (
        select 1 from public.profiles p2
        where p2.id = l.id and p2.workout_reminder_last_sent >= l.today
      )
      and not exists (
        select 1 from public.workout_sessions s
        join public.profiles p3 on p3.id = s.user_id
        where s.user_id = l.id and (s.started_at at time zone p3.timezone)::date = l.today
      )
  ),
  marked as (
    update public.profiles p
    set workout_reminder_last_sent = due.today
    from due
    where p.id = due.id
    returning p.id, due.display_name
  )
  select m.id, m.display_name, s.endpoint, s.p256dh, s.auth
  from marked m
  join public.push_subscriptions s on s.user_id = m.id;
end;
$$;

-- A device the push service no longer knows (uninstalled, permission withdrawn).
create or replace function public.remove_push_subscription(p_secret text, p_endpoint text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.job_secret_ok('workout_reminders', p_secret) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  delete from public.push_subscriptions where endpoint = p_endpoint;
end;
$$;

revoke execute on function public.claim_workout_reminders(text) from public, authenticated;
revoke execute on function public.remove_push_subscription(text, text) from public, authenticated;
grant execute on function public.claim_workout_reminders(text) to anon;
grant execute on function public.remove_push_subscription(text, text) to anon;
