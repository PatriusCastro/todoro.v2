"use client"

import { useState } from "react"
import { HiXMark } from "react-icons/hi2"
import Sheet from "../shared/Sheet"
import Toggle from "../shared/Toggle"
import Segmented, { type SegmentedOption } from "../shared/Segmented"

export type Mode = "25/5" | "50/10" | "custom"

export interface ModeConfig {
  label:     string
  focusMins: number
  breakMins: number
}

export const PRESET_MODES: Record<"25/5" | "50/10", ModeConfig> = {
  "25/5":  { label: "25 / 5",  focusMins: 25, breakMins: 5  },
  "50/10": { label: "50 / 10", focusMins: 50, breakMins: 10 },
}

const MODE_OPTIONS: SegmentedOption<Mode>[] = [
  { value: "25/5",   label: "25 / 5"  },
  { value: "50/10",  label: "50 / 10" },
  { value: "custom", label: "Custom"  },
]

interface SessionSheetProps {
  mode:        Mode
  focusMins:   number
  breakMins:   number
  onModeChange: (mode: Mode, focusMins: number, breakMins: number) => void
  quickMode:   boolean; onQuickMode:   (v: boolean) => void
  reverseMode: boolean; onReverseMode: (v: boolean) => void
  autoStart:   boolean; onAutoStart:   (v: boolean) => void
  onClose:     () => void
}

function MinutesField({ label, value, min, max, onCommit }: {
  label: string; value: number; min: number; max: number; onCommit: (v: number) => void
}) {
  const [draft, setDraft] = useState(String(value))
  return (
    <label className="flex-1 flex flex-col gap-1.5">
      <span className="text-caption font-extrabold uppercase tracking-wider text-tx">{label}</span>
      <span className="flex items-center gap-2">
        <input type="number" inputMode="numeric" value={draft} min={min} max={max}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => {
            const n = Math.min(max, Math.max(min, Number(draft) || min))
            setDraft(String(n))
            onCommit(n)
          }}
          className="w-full min-h-12 rounded-control border border-border bg-surface px-3
            text-lead font-extrabold text-tx text-center outline-none focus:border-accent transition-colors" />
        <span className="text-meta text-sub shrink-0">min</span>
      </span>
    </label>
  )
}

/**
 * Everything about *how* a session runs, one tap from the Timer. Presets, custom
 * lengths and the three modes used to sit permanently on the Timer page, where
 * they competed with the one control that matters.
 */
export default function SessionSheet({
  mode, focusMins, breakMins, onModeChange,
  quickMode, onQuickMode, reverseMode, onReverseMode,
  autoStart, onAutoStart, onClose,
}: SessionSheetProps) {
  const rows: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }[] = [
    { label: "Quick focus", desc: "Start without picking a task first",
      value: quickMode, onChange: onQuickMode },
    { label: "Count up", desc: "Open-ended focus; the break earned is a fifth of it",
      value: reverseMode, onChange: onReverseMode },
    { label: "Auto-start next", desc: "Roll straight into breaks and focus",
      value: autoStart, onChange: onAutoStart },
  ]

  return (
    <Sheet label="Session settings" onClose={onClose} className="px-5 pb-8">
      <div className="flex items-center gap-3 py-3">
        <h2 className="text-title font-extrabold text-tx">Session</h2>
        <button onClick={onClose} aria-label="Close"
          className="ml-auto w-11 h-11 grid place-items-center rounded-control border border-border
            text-sub hover:text-tx transition-colors">
          <HiXMark size={17} />
        </button>
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <span className="text-caption font-extrabold uppercase tracking-wider text-tx">Focus / break</span>
        <Segmented
          options={MODE_OPTIONS}
          value={reverseMode ? ("custom" as Mode) : mode}
          onChange={m => {
            if (m === "custom") onModeChange("custom", focusMins, breakMins)
            else onModeChange(m, PRESET_MODES[m].focusMins, PRESET_MODES[m].breakMins)
          }}
          label="Session length" />
      </div>

      {mode === "custom" && !reverseMode && (
        <div className="flex gap-3 pt-4">
          <MinutesField label="Focus" value={focusMins} min={1} max={180}
            onCommit={v => onModeChange("custom", v, breakMins)} />
          <MinutesField label="Break" value={breakMins} min={1} max={60}
            onCommit={v => onModeChange("custom", focusMins, v)} />
        </div>
      )}

      <div className="flex flex-col pt-2">
        {rows.map(r => (
          <div key={r.label} className="flex items-center gap-4 py-4 border-b border-border last:border-b-0">
            <div className="flex-1 min-w-0">
              <p className="text-lead font-extrabold text-tx">{r.label}</p>
              <p className="text-meta text-sub">{r.desc}</p>
            </div>
            <Toggle checked={r.value} onChange={r.onChange} label={r.label} />
          </div>
        ))}
      </div>

      <button onClick={onClose}
        className="mt-5 w-full min-h-14 flex items-center px-5 rounded-control bg-accent text-white
          text-lead font-extrabold hover:bg-accent-hover active:scale-[0.98] transition-all">
        Done
      </button>
    </Sheet>
  )
}
