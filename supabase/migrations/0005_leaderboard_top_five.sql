-- The board shows a podium, not a directory.
--
-- 0004 cut the list at 50. Nothing rendered 50: the panel is a card on the
-- home screen next to This week, and a reader scanning it wants the few names
-- above them and their own standing. Everything between those two is scroll.
--
-- So the cut moves to 5, and it moves in the SQL rather than in the client.
-- A LIMIT the UI applies is not a limit — the function is callable directly
-- with the anon key and a session, so whatever it returns is what any user can
-- enumerate about the others. Five is now both what is drawn and what is
-- disclosed.
--
-- Ties still spill: rank() gives equal weeks equal places, so a three-way tie
-- at fifth returns seven rows. That is the correct answer to "the top five",
-- and the panel renders whatever arrives.

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
-- See 0004: the RETURNS TABLE columns are variables too, and three of them
-- share a name with a column below. Every reference here is qualified.
#variable_conflict use_column
declare
  week_ms  constant bigint  := 604800000;
  -- The podium. Changing this changes what the app displays *and* what one
  -- account can learn about the others; they are deliberately the same number.
  top_n    constant integer := 5;
  start_ms bigint := (extract(epoch from date_trunc('week', (now() at time zone 'utc'))) * 1000)::bigint
                     + (week_offset * week_ms);
begin
  -- Reciprocity: opting out is also opting out of looking.
  if not exists (
    select 1 from public.settings s
     where s.user_id = auth.uid() and s.leaderboard
  ) then
    return;
  end if;

  return query
  with capped as (
    -- Per user, per UTC day, capped before it is summed — see 0004, rule 3.
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
           -- Sanitised on read, never rejected on write — refusing to sync a
           -- long name would break the account rather than the display.
           left(coalesce(nullif(btrim(named_s.user_name), ''), 'Anonymous'), 24) as display_name
      from totals
      join public.settings named_s on named_s.user_id = totals.user_id
  ),
  ranked as (
    select named.user_id,
           named.display_name,
           named.minutes,
           rank() over (order by named.minutes desc, named.display_name)::integer as place
      from named
     where named.minutes > 0
  )
  select ranked.place,
         ranked.display_name,
         ranked.minutes,
         ranked.user_id = auth.uid() as is_me
    from ranked
   -- The caller always comes back, however far down. A board that silently
   -- omits you reads as broken.
   where ranked.place <= top_n or ranked.user_id = auth.uid()
   order by ranked.place;
end
$$;

comment on function public.leaderboard_week(integer) is
  'Top 5 opted-in users by capped weekly focus minutes, plus the caller. Aggregates only: no user_id, no email, no sessions.';

-- CREATE OR REPLACE keeps the existing grants, but a replace that ever drops
-- and recreates would not. Cheap to restate, and it documents who may call it.
revoke execute on function public.leaderboard_week(integer) from public, anon;
grant  execute on function public.leaderboard_week(integer) to authenticated;
