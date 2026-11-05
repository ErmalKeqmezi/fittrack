-- Rest alerts waiting to be sent as a push notification. A row only exists while
-- a rest timer is running: skipping the rest or sending the alert removes it.

create table public.rest_alerts (
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  endpoint   text not null check (char_length(endpoint) <= 2048),
  p256dh     text not null check (char_length(p256dh) <= 256),
  auth       text not null check (char_length(auth) <= 256),
  ends_at    timestamptz not null,
  label      text not null default '' check (char_length(label) <= 200),
  created_at timestamptz not null default now(),
  primary key (user_id, endpoint)
);

alter table public.rest_alerts enable row level security;

create policy "rest_alerts: owner" on public.rest_alerts
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.rest_alerts from anon;
