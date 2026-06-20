"use client"

interface TimerRingProps {
  minutes:      number
  seconds:      number
  progress:     number
  label:        string
  spentLabel:   string
  size?:        number
  color?:       string
  reverseMode?: boolean
}

// One full ring rotation = 25 min of focus in reverse mode
const REVERSE_CYCLE_SECS = 25 * 60

export default function TimerRing({
  minutes, seconds, progress, label, spentLabel,
  size = 260, color, reverseMode = false,
}: TimerRingProps) {
  const cx     = size / 2
  const r      = cx - 20
  const C      = 2 * Math.PI * r
  // Focus has no fixed color → follow the themed accent (CSS var, so it tracks
  // the accent picker). var() only works via the CSS `stroke` property below.
  const stroke = color ?? "var(--accent)"

  const totalSecs        = minutes * 60 + seconds
  const cycleNum         = Math.floor(totalSecs / REVERSE_CYCLE_SECS) + 1
  const cycleProgress    = (totalSecs % REVERSE_CYCLE_SECS) / REVERSE_CYCLE_SECS
  const displayProgress  = reverseMode ? cycleProgress : progress
  const displayLabel     = reverseMode && cycleNum > 1 ? `Cycle ${cycleNum}` : label

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--ring)" strokeWidth={7} />
        <circle cx={cx} cy={cx} r={r} fill="none" strokeWidth={7}
          strokeLinecap="round" strokeDasharray={C}
          strokeDashoffset={C * (1 - displayProgress)}
          style={{ stroke, transition: "stroke-dashoffset 1s linear" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <span className="text-[11px] font-medium text-sub">
          {displayLabel}
        </span>
        <span
          className="font-semibold tracking-tight leading-none text-tx tabular-nums"
          style={{ fontSize: size < 200 ? "2.25rem" : size < 280 ? "3rem" : "3.75rem" }}>
          {minutes}:{seconds.toString().padStart(2, "0")}
        </span>
        <span className="text-[11px] text-sub">
          {reverseMode ? "elapsed" : spentLabel}
        </span>
      </div>
    </div>
  )
}