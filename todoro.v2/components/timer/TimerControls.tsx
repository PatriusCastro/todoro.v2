"use client"

import { HiArrowPath, HiPlay, HiPause, HiForward, HiStop } from "react-icons/hi2"

type Phase = "focus" | "break" | "longbreak"

interface TimerControlsProps {
  running:        boolean
  phase:          Phase
  reverseMode?:   boolean
  onToggle:       () => void
  onReset:        () => void
  onSkip:         () => void
  onStopAndRest?: () => void
  /** Focus view: icon-only, unfilled, no labels. Nothing to read while working. */
  minimal?:       boolean
}

/**
 * Reset · primary · skip. The primary fills the row so it reads as the one
 * thing to press; the two secondaries are square and quiet either side of it.
 */
export default function TimerControls({
  running, phase, reverseMode = false,
  onToggle, onReset, onSkip, onStopAndRest, minimal = false,
}: TimerControlsProps) {
  const showStopAndRest = reverseMode && phase === "focus" && running && onStopAndRest

  const primaryLabel = running
    ? "Pause"
    : phase === "focus" ? (reverseMode ? "Begin focus" : "Start focus")
    : phase === "longbreak" ? "Start long break" : "Start break"

  // Focus view strips the chrome: three quiet icon buttons, nothing filled and
  // nothing to read. A big pink "Pause" is the loudest thing on a screen whose
  // entire purpose is to stop demanding attention.
  if (minimal) {
    const ghost = `w-13 h-13 grid place-items-center rounded-pill text-sub
      hover:text-tx hover:bg-surface2 active:scale-95 transition-all duration-150`
    return (
      <div className="flex items-center gap-3">
        <button onClick={onReset} aria-label="Reset session" className={ghost}>
          <HiArrowPath size={20} />
        </button>
        <button
          onClick={showStopAndRest ? onStopAndRest : onToggle}
          aria-label={showStopAndRest ? "Stop and rest" : primaryLabel}
          className={`w-16 h-16 grid place-items-center rounded-pill border border-border
            text-tx hover:border-accent hover:text-accent active:scale-95 transition-all duration-150`}>
          {showStopAndRest ? <HiStop size={22} /> : running ? <HiPause size={22} /> : <HiPlay size={22} />}
        </button>
        <button onClick={onSkip}
          aria-label={phase === "focus" ? "Skip to break" : "Skip to focus"}
          className={ghost}>
          <HiForward size={20} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-stretch gap-2">
      <button onClick={onReset} aria-label="Reset session"
        className="w-15 min-h-15 shrink-0 grid place-items-center rounded-control border border-border
          text-tx hover:border-accent/50 hover:text-accent active:scale-95 transition-all duration-150">
        <HiArrowPath size={19} />
      </button>

      {showStopAndRest ? (
        <button onClick={onStopAndRest}
          className="flex-1 min-h-15 flex items-center justify-center gap-2.5 rounded-control
            bg-priority-low text-white text-heading font-extrabold
            hover:brightness-105 active:scale-[0.98] transition-all duration-150">
          <HiStop size={18} /> Stop &amp; rest
        </button>
      ) : (
        <button onClick={onToggle}
          className="flex-1 min-h-15 flex items-center justify-center gap-2.5 rounded-control
            bg-accent text-white text-heading font-extrabold
            hover:bg-accent-hover active:scale-[0.98] transition-all duration-150">
          {running ? <HiPause size={18} /> : <HiPlay size={18} />}
          {primaryLabel}
        </button>
      )}

      <button onClick={onSkip}
        aria-label={phase === "focus" ? "Skip to break" : "Skip to focus"}
        className="w-15 min-h-15 shrink-0 grid place-items-center rounded-control border border-border
          text-tx hover:border-accent/50 hover:text-accent active:scale-95 transition-all duration-150">
        <HiForward size={19} />
      </button>
    </div>
  )
}
