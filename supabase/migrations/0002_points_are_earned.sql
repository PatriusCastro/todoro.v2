-- Points must be earned, not declared.
--
-- Before this, `points` was a number in localStorage — editable in DevTools —
-- and `point_ops` accepted whatever `points_delta` the client posted. RLS only
-- checks *whose* row it is, never whether the number was earned, so a request
-- with the anon key and a valid session could mint any balance.
--
-- The fix is to split the two halves and make only one of them client-writable:
--
--   earned  <- derived from `sessions`, which is append-only and immutable
--              (select+insert policies only; no update or delete, so the verbs
--              are denied by default). The client recomputes the total from the
--              log rather than storing it, so editing localStorage does nothing.
--
--   spent   <- `point_ops`, constrained below so it can only ever *cost*.
--
-- Being straight about the ceiling: this is tamper resistance, not security.
-- The client runs on the user's machine, so fabricated *sessions* remain
-- possible and no client-side app can prevent that. What this removes is the
-- one-line cheat, and it makes the remaining one require deliberate, visible
-- effort. For a single-user app the person cheated is the cheater, so that is
-- the right place to stop.

-- A ledger entry can never be a credit. Buying a Streak Freeze is
-- (points_delta = -250, freeze_delta = +1); spending one is
-- (freeze_delta = -1, protected_add = ['YYYY-MM-DD']).
alter table public.point_ops
  add constraint point_ops_is_never_a_credit
  check (points_delta <= 0);

-- One freeze at a time, in either direction. Bounds a client that decides to
-- grant itself a hundred.
alter table public.point_ops
  add constraint point_ops_freeze_delta_bounded
  check (freeze_delta between -1 and 1);

-- A grant must be paid for, and a spend must not also hand out freezes.
alter table public.point_ops
  add constraint point_ops_grant_is_paid
  check (
    (freeze_delta = 1  and points_delta < 0) or   -- purchase
    (freeze_delta = -1 and points_delta = 0) or   -- use one to bridge a day
    (freeze_delta = 0)                            -- a plain spend
  );

-- Protected dates only ever arrive attached to spending a freeze, so a client
-- cannot quietly extend its own streak for free.
alter table public.point_ops
  add constraint point_ops_protected_needs_a_freeze
  check (cardinality(protected_add) = 0 or freeze_delta = -1);

-- Cheap plausibility bounds on the session log itself. Not a serious barrier —
-- someone determined can still post believable sessions — but they cost
-- nothing and rule out the lazy version: a single session claiming a thousand
-- minutes, or one dated next year to inflate a streak.
alter table public.sessions
  add constraint sessions_focus_mins_sane
  check (focus_mins between 0 and 240);

-- Epoch milliseconds, not seconds, and not in the future beyond a day's worth
-- of timezone and clock skew.
alter table public.sessions
  add constraint sessions_at_is_plausible
  check (
    at > 1262304000000                                            -- after 2010-01-01
    and at < (extract(epoch from now()) * 1000)::bigint + 86400000 -- < ~1 day ahead
  );

comment on table public.point_ops is
  'Spend ledger. Earnings are derived from `sessions`; nothing here may credit points.';
