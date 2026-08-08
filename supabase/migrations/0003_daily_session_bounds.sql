-- Daily bounds on the session log.
--
-- This is a BOUND, not a BARRIER, and the distinction matters. The server
-- cannot tell a real 25-minute focus session from a fabricated one — verifying
-- that would mean the server witnessing the timer, which is impossible for an
-- app whose whole premise is that it works offline. What these limits do is cap
-- how fast a forged history can inflate a balance: instead of unbounded, a day
-- can produce at most a physically plausible amount of focus.
--
-- Deliberately generous. The failure mode to avoid is a legitimate history that
-- can no longer sync, which would be far worse than the cheating this deters.
-- Nobody focuses for twenty-four hours in a day; a limit set anywhere near real
-- usage would be a support burden for no security gain.

-- 24h of wall-clock focus. The per-session bound from 0002 (0..240 minutes)
-- already stops a single row claiming a week.
create or replace function public.enforce_daily_session_bounds()
returns trigger
language plpgsql
as $$
declare
  day_start      bigint;
  existing_count integer;
  existing_mins  integer;
begin
  -- UTC days, not the user's local day. The server has no idea what timezone
  -- the client is in, and for a bound this loose the boundary doesn't matter.
  day_start := (floor(new.at / 86400000.0) * 86400000)::bigint;

  -- `key <> new.key` is load-bearing. BEFORE INSERT fires ahead of conflict
  -- detection, so a re-push of an existing session would otherwise count itself
  -- and a legitimate full-history upload could trip its own limit.
  select count(*), coalesce(sum(focus_mins), 0)
    into existing_count, existing_mins
    from public.sessions
   where user_id = new.user_id
     and at >= day_start
     and at <  day_start + 86400000
     and key <> new.key;

  if existing_count + 1 > 60 then
    raise exception 'More than 60 focus sessions in one day'
      using errcode = 'check_violation';
  end if;

  if existing_mins + new.focus_mins > 1440 then
    raise exception 'More focused minutes in one day than a day contains'
      using errcode = 'check_violation';
  end if;

  return new;
end
$$;

create trigger sessions_daily_bounds
  before insert on public.sessions
  for each row execute function public.enforce_daily_session_bounds();

-- The trigger scans by (user_id, at); the existing pull index is on
-- (user_id, created_at) and wouldn't serve it.
create index if not exists sessions_day_idx on public.sessions (user_id, at);

comment on function public.enforce_daily_session_bounds() is
  'Caps how fast a forged history can inflate points. Not proof of work — an offline-first app cannot have that.';
