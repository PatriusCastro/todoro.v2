"use client"

interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
  /** Announced to screen readers — the visible row label usually works verbatim. */
  label: string
  disabled?: boolean
}

/**
 * Pill switch. The visible track is 58×34, but the button around it is 44px tall
 * so the touch target clears the accessibility floor without the control looking
 * oversized.
 */
export default function Toggle({ checked, onChange, label, disabled = false }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="shrink-0 flex items-center min-h-11 disabled:opacity-40">
      <span className={`flex items-center w-14.5 h-8.5 p-0.75 rounded-pill border transition-colors duration-150
        ${checked ? "bg-accent border-accent justify-end" : "bg-transparent border-border justify-start"}`}>
        <span className={`w-6 h-6 rounded-pill transition-colors duration-150
          ${checked ? "bg-bg" : "bg-tx"}`} />
      </span>
    </button>
  )
}
