-- Weekly focus leaderboard.
--
-- Every other table here is single-user: RLS says `auth.uid() = user_id` and
-- that is the whole story. A leaderboard is the first thing in this schema that
-- deliberately shows one account's data to another, so it gets three rules that
-- the rest of the schema doesn't need.
--
--   1. Opt in, or you are neither listed nor able to look. The name and the
--      hours were given to a private app; publishing them to strangers is a
--      different deal, so it is off until asked for, and asking is reciprocal —
--      you appear on the same board you can read.
--
--   2. Aggregates only, through a function. No cross-user SELECT policy is
--      added to any table: the RPC below is the only path, it returns a name
--      and a number, and the underlying rows stay as unreachable as before.
--
--   3. A daily cap, applied here rather than at the storage layer. 0003 bounds
--      a day at 1440 minutes and says why it is deliberately generous — the
--      failure mode it avoids is a real history that can no longer sync. That
--      reasoning is still right, and it means a fabricated week can pass every
--      constraint in this schema. Since sessions are client-asserted and always
--      will be for an offline-first app, the board cannot be made accurate;
--      what it can be is boring to cheat. Counting at most 8 hours a day puts
--      the top of the board within reach of a genuinely heavy week, so leading
--      means having focused a lot rather than having edited localStorage.
--
-- What this is not: proof of work. Someone determined can still post plausible
-- sessions up to the cap. The remedy for that is social, not technical.

-- ── Opt-in ──────────────────────────────────────────────────────────────────
-- NOT NULL DEFAULT false, unlike its nullable neighbours on this table: a null
-- here would have to be read as a tri-state, and there is no safe way to read
-- "unknown" as consent. Absent means out.
alter table public.settings
  add column if not exists leaderboard boolean not null default false;

comment on column public.settings.leaderboard is
  'Publishes user_name and weekly focus minutes to other opted-in users. Off until asked for.';

-- ── Indexes ─────────────────────────────────────────────────────────────────
-- The existing session indexes are both prefixed by user_id, which serves a
-- pull and the daily-bounds trigger but not a scan *across* users bounded by
-- `at`. This one does, and carries the columns the aggregate reads so the week
-- can be summed without visiting the heap.
create index if not exists sessions_week_idx
  on public.sessions (at) include (user_id, focus_mins);

-- Partial: the board only ever joins the opted-in minority.
create index if not exists settings_leaderboard_idx
  on public.settings (user_id) where leaderboard;

-- ── The board ───────────────────────────────────────────────────────────────
-- SECURITY DEFINER, so it reads past the RLS policies that would otherwise hide
-- every other user's rows — which is exactly why it returns no user_id, no
-- email and no session detail. `is_me` is how a caller finds their own row
-- without anyone's identifier crossing the wire.
--
-- `week_offset` is 0 for the current week, -1 for last week. Weeks are Monday
-- 00:00 UTC, following 0003's choice of UTC days: the server cannot know a
-- caller's timezone, and a shared board needs one boundary for everybody rather
-- than one per reader.
create or replace function public.leaderboard_week(week_offset integer default 0)
returns table (
  place        integer,
  display_name text,
  minutes      integer,
  is_me        boolean
)
language plpgsql
security definer
set search_path = ''
stable
as $$
-- The RETURNS TABLE columns are plpgsql variables too, and three of them share
-- a name with a column in the query below. Every reference here is qualified,
-- so this only decides what an unqualified one would mean if it were ever
-- added — a column, not the out-param it would silently shadow.
#variable_conflict use_column
declare
  week_ms  constant bigint := 604800000;
  -- extract(epoch from a timestamp without time zone) reads it as UTC, which is
  -- what `now() at time zone 'utc'` just produced.
  start_ms bigint := (extract(epoch from date_trunc('week', (now() at time zone 'utc'))) * 1000)::bigint
                     + (week_offset * week_ms);
begin
  -- Reciprocity, and the belt to the client's braces: opting out is also opting
  -- out of looking. An anonymous caller has no row and so gets nothing.
  if not exists (
    select 1 from public.settings s
     where s.user_id = auth.uid() and s.leaderboard
  ) then
    return;
  end if;

  return query
  with capped as (
    -- Per user, per UTC day, capped before it is summed — see rule 3.
    select sess.user_id,
           least(sum(sess.focus_mins), 480) as mins
      from public.sessions sess
      join public.settings opted
        on opted.user_id = sess.user_id and opted.leaderboard
     where sess.at >= start_ms
       and sess.at <  start_ms + week_ms
     group by sess.user_id, floor(sess.at / 86400000.0)
  ),
  totals as (
    select capped.user_id,
           sum(capped.mins)::integer as minutes
      from capped
     group by capped.user_id
  ),
  named as (
    select totals.user_id,
           totals.minutes,
           -- user_name is free text nobody validates and it is about to be
           -- shown to strangers, so it is trimmed and cut to a length that
           -- cannot push a row off the screen. Sanitised on read, never
           -- rejected on write: refusing to sync a long name would break the
           -- account rather than the display.
           left(coalesce(nullif(btrim(named_s.user_name), ''), 'Anonymous'), 24) as display_name
      from totals
      join public.settings named_s on named_s.user_id = totals.user_id
  ),
  ranked as (
    select named.user_id,
           named.display_name,
           named.minutes,
           -- rank(), not row_number(): equal weeks are equal places, and the
           -- tiebreak is the name so the order is stable between reads.
           rank() over (order by named.minutes desc, named.display_name)::integer as place
      from named
     where named.minutes > 0
  )
  select ranked.place,
         ranked.display_name,
         ranked.minutes,
         ranked.user_id = auth.uid() as is_me
    from ranked
   -- The caller always comes back, however far down they are — a board that
   -- silently omits you reads as broken.
   where ranked.place <= 50 or ranked.user_id = auth.uid()
   order by ranked.place;
end
$$;

comment on function public.leaderboard_week(integer) is
  'Opted-in users ranked by capped weekly focus minutes. Aggregates only: no user_id, no email, no sessions.';

-- EXECUTE is granted to PUBLIC by default, and the anon key ships in the JS
-- bundle — so without this revoke the board would be readable by anyone who
-- opened the site, account or not.
revoke execute on function public.leaderboard_week(integer) from public, anon;
grant  execute on function public.leaderboard_week(integer) to authenticated;
