"use client"

interface StepperProps {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  /** Announced with each button, e.g. "sessions" → "More sessions". */
  unit: string
}

/**
 * Bounded −/value/+ control. Both buttons are 46px so they're comfortable on a
 * phone, and the readout is tabular so the group doesn't jitter as digits change.
 */
export default function Stepper({ value, onChange, min = 1, max = 12, unit }: StepperProps) {
  const atMin = value <= min
  const atMax = value >= max

  return (
    <div className="shrink-0 flex items-center rounded-control border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={atMin}
        aria-label={`Fewer ${unit}`}
        className="w-11.5 h-11.5 grid place-items-center border-r border-border text-lead font-extrabold
          text-tx hover:text-accent disabled:opacity-30 disabled:hover:text-tx transition-colors">
        −
      </button>
      <span aria-live="polite" className="w-12 text-center text-lead font-extrabold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={atMax}
        aria-label={`More ${unit}`}
        className="w-11.5 h-11.5 grid place-items-center border-l border-border text-lead font-extrabold
          text-tx hover:text-accent disabled:opacity-30 disabled:hover:text-tx transition-colors">
        +
      </button>
    </div>
  )
}
