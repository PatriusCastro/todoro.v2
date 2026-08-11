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

const weekLabel = () => {
  const start = weekStartUTC()
  const end = new Date(start.getTime() + 6 * 86400000)
  const fmt = (d: Date) =>
    d.toLocaleDateString([], { month: "short", day: "numeric", timeZone: "UTC" })
  return `${fmt(start)} – ${fmt(end)} UTC`
}

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

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await fetchWeek(0))
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
    void load()
  }, [signedIn, optedIn, load])

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
          className="min-h-11 px-4 self-start rounded-control bg-accent text-white text-meta font-extrabold
            hover:bg-accent-hover active:scale-[0.98] transition-all duration-150">
          Join the leaderboard
        </button>
      </Panel>
    )
  }

  return (
    <Panel className="flex flex-col gap-3">
      <SectionHeader
        icon={<HiTrophy size={13} />}
        meta={weekLabel()}
        action={
          <button onClick={() => void load()}
            disabled={loading}
            aria-label="Refresh the leaderboard"
            className="w-8 h-8 -my-1 grid place-items-center rounded-lg text-sub
              hover:text-accent disabled:opacity-40 transition-colors duration-150">
            <HiArrowPath size={13} className={loading ? "animate-spin" : ""} />
          </button>
        }>
        Weekly leaderboard
      </SectionHeader>

      {error ? (
        <p className="text-meta text-priority-high">{error}</p>
      ) : rows === null ? (
        <p className="text-meta text-sub">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-meta text-sub leading-relaxed">
          Nobody has focused yet this week. Finish a session and you&rsquo;ll be first.
        </p>
      ) : (
        <div className="flex flex-col">
          {rows.map(row => (
            <div key={`${row.place}-${row.displayName}`}
              className={`flex items-center gap-3 py-2 border-t border-border first:border-t-0
                ${row.isMe ? "text-tx" : ""}`}>
              {/* Fixed width, tabular: the places have to line up as a column
                  even when the board reaches three digits. */}
              <span className={`w-7 shrink-0 text-meta font-extrabold tabular-nums
                ${row.place <= 3 ? "text-accent" : "text-sub"}`}>
                {row.place}
              </span>
              <span className={`flex-1 min-w-0 truncate text-meta
                ${row.isMe ? "font-extrabold text-tx" : "text-tx"}`}>
                {row.displayName}
                {row.isMe && <span className="ml-1.5 text-caption text-accent font-extrabold">You</span>}
              </span>
              <span className="shrink-0 text-meta text-sub tabular-nums">
                {formatMins(row.minutes)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Said plainly rather than not at all: the number is capped, and the app
          has no way to prove anyone's hours are real. */}
      <p className="text-caption text-sub leading-relaxed">
        Up to 8h counted per day. Sessions are recorded by each person&rsquo;s own device.{" "}
        <button onClick={() => onOptIn(false)}
          className="text-sub underline hover:text-tx transition-colors">
          Leave
        </button>
      </p>
    </Panel>
  )
}
