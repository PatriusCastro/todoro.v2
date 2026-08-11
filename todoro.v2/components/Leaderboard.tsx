"use client"

import { useCallback, useEffect, useState } from "react"
import { HiTrophy, HiArrowPath } from "react-icons/hi2"
import { fetchWeek, formatMins, weekStartUTC, type LeaderboardRow } from "../lib/leaderboard"
import Panel from "./shared/Panel"
import SectionHeader from "./shared/SectionHeader"

interface LeaderboardProps {
  /** False while signed out — the panel renders nothing at all then. */
  signedIn: boolean
  optedIn: boolean
  onOptIn: (v: boolean) => void
}

/** 0 is the current week, -1 the one before it. The RPC takes the same offset. */
type Week = 0 | -1

const weekLabel = (offset: Week) => {
  const start = weekStartUTC(offset)
  const end = new Date(start.getTime() + 6 * 86400000)
  const fmt = (d: Date) =>
    d.toLocaleDateString([], { month: "short", day: "numeric", timeZone: "UTC" })
  return `${fmt(start)} – ${fmt(end)}`
}

/** Matches the profile avatar in Settings, so one person reads the same in both. */
const initialsOf = (name: string) => name.slice(0, 2).toUpperCase()

/**
 * Weekly focus hours across opted-in accounts.
 *
 * Signed out, this renders nothing. Sync is optional in this app and every
 * other surface keeps that promise; a card saying "sign in to compete" on the
 * home screen of a local-first app is a nag, and the toggle in Settings is
 * where someone goes looking for this anyway.
 */
export default function Leaderboard({ signedIn, optedIn, onOptIn }: LeaderboardProps) {
  const [rows,    setRows]    = useState<LeaderboardRow[] | null>(null)
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [week,    setWeek]    = useState<Week>(0)

  const load = useCallback(async (offset: Week) => {
    setLoading(true)
    setError(null)
    try {
      setRows(await fetchWeek(offset))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load the leaderboard")
    } finally {
      setLoading(false)
    }
  }, [])

  // Only ever fetched while opted in. The SQL enforces the same thing, but a
  // request that is certain to come back empty is one not worth sending.
  useEffect(() => {
    if (!signedIn || !optedIn) { setRows(null); return }
    void load(week)
  }, [signedIn, optedIn, week, load])

  if (!signedIn) return null

  if (!optedIn) {
    return (
      <Panel className="flex flex-col gap-3">
        <SectionHeader icon={<HiTrophy size={13} />}>Weekly leaderboard</SectionHeader>
        <p className="text-meta text-sub leading-relaxed">
          Compare focus hours with other Todoro users. Joining publishes{" "}
          <span className="text-tx font-semibold">your name and your weekly focus time</span>{" "}
          to everyone else who has joined — nothing else, and you can leave at any time.
        </p>
        <button onClick={() => onOptIn(true)}
          className="min-h-12 px-4 self-start rounded-control bg-accent text-white text-meta font-extrabold
            hover:bg-accent-hover active:scale-[0.98] transition-all duration-150">
          Join the leaderboard
        </button>
      </Panel>
    )
  }

  // The leader sets the scale. Every bar is read against the same top, which is
  // what makes a glance down the column mean anything.
  const top = rows?.reduce((n, r) => Math.max(n, r.minutes), 0) ?? 0
  const alone = rows?.length === 1 && rows[0].isMe

  return (
    <Panel className="flex flex-col gap-3">
      <SectionHeader
        icon={<HiTrophy size={13} />}
        action={
          <button onClick={() => void load(week)}
            disabled={loading}
            aria-label="Refresh the leaderboard"
            className="w-9 h-9 -my-1 grid place-items-center rounded-lg text-sub
              hover:text-accent disabled:opacity-40 transition-colors duration-150">
            <HiArrowPath size={14} className={loading ? "animate-spin" : ""} />
          </button>
        }>
        Weekly leaderboard
      </SectionHeader>

      {/* The range sits beside the control that changes it, rather than in the
          header where it read as a fixed caption. */}
      <div className="flex items-center gap-3">
        <div role="group" aria-label="Which week"
          className="shrink-0 flex items-center rounded-control border border-border overflow-hidden">
          {([0, -1] as Week[]).map((w, i) => (
            <button key={w} onClick={() => setWeek(w)}
              aria-pressed={week === w}
              className={`min-h-11 px-3 text-meta font-extrabold whitespace-nowrap transition-colors duration-150
                ${i > 0 ? "border-l border-border" : ""}
                ${week === w ? "bg-accent text-white" : "text-tx hover:bg-surface2"}`}>
              {w === 0 ? "This week" : "Last week"}
            </button>
          ))}
        </div>
        <span className="ml-auto text-caption text-sub tabular-nums text-right">
          {weekLabel(week)} <span className="opacity-70">UTC</span>
        </span>
      </div>

      {error ? (
        <p className="text-meta text-priority-high">{error}</p>
      ) : rows === null ? (
        <Skeleton />
      ) : rows.length === 0 ? (
        <p className="text-meta text-sub leading-relaxed">
          {week === 0
            ? "Nobody has focused yet this week. Finish a session and you'll be first."
            : "Nothing was logged that week."}
        </p>
      ) : (
        <div className="flex flex-col">
          {rows.map((row, i) => (
            <Row key={`${row.place}-${row.displayName}`}
              row={row}
              top={top}
              first={i === 0}
              // The RPC always returns you, however far down. A jump in places
              // is real distance, and saying so beats an adjacent pair of rows
              // that silently misrepresent the gap.
              gapBefore={i > 0 && row.place > rows[i - 1].place + 1} />
          ))}
        </div>
      )}

      {alone && (
        <p className="text-caption text-sub">
          You&rsquo;re the only one here this week.
        </p>
      )}

      {/* Said plainly rather than not at all: the number is capped, and the app
          has no way to prove anyone's hours are real. */}
      <div className="flex items-end gap-3 pt-0.5 border-t border-border">
        <p className="flex-1 text-caption text-sub leading-relaxed pt-2.5">
          Up to 8h counted per day · each person&rsquo;s own device records their sessions
        </p>
        <button onClick={() => onOptIn(false)}
          className="shrink-0 -mr-1 px-2 min-h-11 text-caption font-semibold text-sub
            hover:text-priority-high transition-colors duration-150">
          Leave
        </button>
      </div>
    </Panel>
  )
}

function Row({ row, top, first, gapBefore }: {
  row: LeaderboardRow; top: number; first: boolean; gapBefore: boolean
}) {
  const width = top > 0 ? Math.max(2, (row.minutes / top) * 100) : 0

  return (
    <>
      {gapBefore && (
        <span aria-hidden="true" className="py-1 text-center text-caption text-sub tracking-widest">···</span>
      )}
      <div
        className={`flex items-center gap-2.5 py-2.5 ${first || gapBefore ? "" : "border-t border-border"}
          ${row.isMe ? "-mx-2 px-2 rounded-control bg-accent/8" : ""}`}>

        {/* First place is the only one that gets a fill. Second and third keep
            the accent in the numeral — a three-tier medal palette would be
            three colours this system doesn't have. */}
        {/* min-w rather than w: the caller's own row comes back whatever their
            place is, and three digits must not spill out of the chip. */}
        <span className={`min-w-6 h-6 px-1 shrink-0 grid place-items-center rounded-md text-caption font-extrabold tabular-nums
          ${row.place === 1 ? "bg-accent text-white"
            : row.place <= 3 ? "text-accent" : "text-sub"}`}>
          {row.place}
        </span>

        <span className={`w-7 h-7 shrink-0 grid place-items-center rounded-lg text-caption font-extrabold
          ${row.isMe ? "bg-accent text-white" : "bg-surface2 text-sub"}`}>
          {initialsOf(row.displayName)}
        </span>

        <span className="flex-1 min-w-0 flex flex-col gap-1.5">
          <span className="flex items-baseline gap-2">
            <span className={`min-w-0 truncate text-meta font-extrabold
              ${row.isMe ? "text-accent" : "text-tx"}`}>
              {row.displayName}
            </span>
            {row.isMe && (
              <span className="shrink-0 text-caption font-extrabold uppercase tracking-wider text-accent">
                You
              </span>
            )}
            <span className="ml-auto shrink-0 text-meta font-extrabold tabular-nums text-tx">
              {formatMins(row.minutes)}
            </span>
          </span>
          {/* Same track-and-fill as the project rows on this screen. */}
          <span className="block h-1.5 rounded-chip bg-surface2 overflow-hidden">
            <span className={`block h-full rounded-chip transition-[width] duration-500
              ${row.isMe ? "bg-accent" : "bg-sub"}`}
              style={{ width: `${width}%` }} />
          </span>
        </span>
      </div>
    </>
  )
}

/** Three rows of the real shape — a spinner here would say less and jump more. */
function Skeleton() {
  return (
    <div className="flex flex-col animate-pulse" aria-hidden="true">
      {[0, 1, 2].map(i => (
        <div key={i} className={`flex items-center gap-2.5 py-2.5 ${i > 0 ? "border-t border-border" : ""}`}>
          <span className="w-6 h-6 shrink-0 rounded-md bg-surface2" />
          <span className="w-7 h-7 shrink-0 rounded-lg bg-surface2" />
          <span className="flex-1 min-w-0 flex flex-col gap-1.5">
            <span className="block h-3 rounded-chip bg-surface2" style={{ width: `${55 - i * 12}%` }} />
            <span className="block h-1.5 rounded-chip bg-surface2" />
          </span>
        </div>
      ))}
    </div>
  )
}
