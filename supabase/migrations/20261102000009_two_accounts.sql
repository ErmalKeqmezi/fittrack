-- Allow two private accounts instead of one. Row Level Security already keeps
-- each account's data separate. New accounts are created from the Supabase
-- dashboard: the public /setup page still closes after the first account.

create or replace function public.enforce_account_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Serialize sign-ups so two simultaneous requests cannot both pass the count.
  perform pg_catalog.pg_advisory_xact_lock(hashtext('fittrack_account_limit'));
  if (select count(*) from auth.users) >= 2 then
    raise exception 'FitTrack has reached its limit of 2 accounts. Registration is closed.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_account_limit() from public, anon, authenticated;

drop trigger fittrack_single_account on auth.users;
drop function public.enforce_single_account();

create trigger fittrack_account_limit
  before insert on auth.users
  for each row execute function public.enforce_account_limit();
