"use client"

interface TimerRingProps {
  minutes:      number
  seconds:      number
  progress:     number
  /** One line under the clock, e.g. "Session 2 of 5". */
  caption?:     string
  size?:        number
  color?:       string
  reverseMode?: boolean
}

// One full ring rotation = 25 min of focus in reverse mode
const REVERSE_CYCLE_SECS = 25 * 60

export default function TimerRing({
  minutes, seconds, progress, caption,
  size = 260, color, reverseMode = false,
}: TimerRingProps) {
  // Stroke scales with the ring so it reads the same at 240 and 320. The old
  // fixed 7px looked like a hairline once the ring grew.
  const width = Math.max(8, Math.round(size * 0.042))
  const cx    = size / 2
  const r     = cx - width / 2 - 2
  const C     = 2 * Math.PI * r
  // Focus has no fixed colour → follow the themed accent (a CSS var, so it
  // tracks the accent picker). var() only resolves via the `stroke` property.
  const stroke = color ?? "var(--accent)"

  const totalSecs       = minutes * 60 + seconds
  const cycleProgress   = (totalSecs % REVERSE_CYCLE_SECS) / REVERSE_CYCLE_SECS
  const displayProgress = Math.min(1, Math.max(0, reverseMode ? cycleProgress : progress))

  // A round linecap on a zero-length dash paints a dot, so an untouched timer
  // showed a stray bead floating at 12 o'clock. Below a visible arc length,
  // draw nothing at all.
  const showArc = displayProgress > 0.004

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <g transform={`rotate(-90 ${cx} ${cx})`}>
          <circle cx={cx} cy={cx} r={r} fill="none"
            stroke="color-mix(in srgb, var(--tx) 12%, transparent)" strokeWidth={width} />
          {showArc && (
            <circle cx={cx} cy={cx} r={r} fill="none" strokeWidth={width}
              strokeLinecap="round"
              strokeDasharray={`${C * displayProgress} ${C}`}
              style={{ stroke, transition: "stroke-dasharray 1s linear" }} />
          )}
        </g>
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
        <span className="font-extrabold tracking-tight leading-none text-tx tabular-nums"
          style={{ fontSize: Math.round(size * 0.215) }}>
          {minutes}:{seconds.toString().padStart(2, "0")}
        </span>
        {caption && <span className="text-meta text-sub">{caption}</span>}
      </div>
    </div>
  )
}
