"use client"

import { useState } from "react"
import { HiArrowPath, HiBolt } from "react-icons/hi2"

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

interface ModeSelectorProps {
  active:         Mode
  customFocus:    number
  customBreak:    number
  onChange:       (mode: Mode, focusMins: number, breakMins: number) => void
  reverseMode?:   boolean
  onReverseMode?: (v: boolean) => void
  quickMode?:     boolean
  onQuickMode?:   (v: boolean) => void
}

export default function ModeSelector({
  active, customFocus, customBreak, onChange,
  reverseMode = false, onReverseMode,
  quickMode = false, onQuickMode,
}: ModeSelectorProps) {
  const [cf, setCf] = useState(customFocus)
  const [cb, setCb] = useState(customBreak)

  const applyCustom = () => onChange("custom", Math.max(1, cf), Math.max(1, cb))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {(["25/5", "50/10", "custom"] as Mode[]).map(m => (
          <button key={m} onClick={() => {
            if (m === "custom") onChange("custom", cf, cb)
            else onChange(m, PRESET_MODES[m].focusMins, PRESET_MODES[m].breakMins)
          }}
            className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all duration-200
              ${active === m && !reverseMode
                ? "bg-accent text-white border-accent"
                : "bg-transparent text-sub border-border hover:border-accent/50 hover:text-tx"}`}>
            {m === "custom" ? "Custom" : m}
          </button>
        ))}
      </div>

      {active === "custom" && !reverseMode && (
        <div className="flex gap-3 bg-surface2 rounded-xl p-3 border border-border">
          <div className="flex-1 flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-sub uppercase tracking-wide">Focus</span>
            <div className="flex items-center gap-2">
              <input type="number" value={cf} min={1} max={180}
                onChange={e => setCf(Number(e.target.value))}
                onBlur={applyCustom}
                className="w-full bg-surface border border-border rounded-lg px-2 py-1.5 text-sm font-bold text-tx text-center outline-none focus:border-accent transition-colors" />
              <span className="text-xs text-sub shrink-0">min</span>
            </div>
          </div>
          <div className="w-px bg-border" />
          <div className="flex-1 flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-sub uppercase tracking-wide">Break</span>
            <div className="flex items-center gap-2">
              <input type="number" value={cb} min={1} max={60}
                onChange={e => setCb(Number(e.target.value))}
                onBlur={applyCustom}
                className="w-full bg-surface border border-border rounded-lg px-2 py-1.5 text-sm font-bold text-tx text-center outline-none focus:border-accent transition-colors" />
              <span className="text-xs text-sub shrink-0">min</span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Mode toggle — focus without picking a task */}
      {onQuickMode && (
        <button
          onClick={() => onQuickMode(!quickMode)}
          className={`w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-all duration-200
            ${quickMode
              ? "bg-[#FFBA00]/10 border-[#FFBA00]/40"
              : "bg-transparent border-border hover:border-accent/30 hover:text-tx"}`}>
          <div className="flex items-center gap-2.5">
            <HiBolt size={15} className={quickMode ? "text-[#FFBA00]" : "text-sub"} />
            <div className="text-left">
              <p className={`text-xs font-bold ${quickMode ? "text-[#FFBA00]" : "text-tx"}`}>Quick Mode</p>
              <p className="text-[11px] text-sub">Focus without picking a task</p>
            </div>
          </div>
          <div className={`relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0 ${quickMode ? "bg-[#FFBA00]" : "bg-ring"}`}>
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${quickMode ? "translate-x-4" : "translate-x-0"}`} />
          </div>
        </button>
      )}

      {/* Reverse Mode toggle — always rendered when onReverseMode is provided */}
      <button
        onClick={() => onReverseMode?.(!reverseMode)}
        className={`w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-all duration-200
          ${reverseMode
            ? "bg-accent/10 border-accent/40"
            : "bg-transparent border-border hover:border-accent/30 hover:text-tx"}`}
      >
        <div className="flex items-center gap-2.5">
          <HiArrowPath size={15} className={reverseMode ? "text-accent" : "text-sub"} />
          <div className="text-left">
            <p className={`text-xs font-bold ${reverseMode ? "text-accent" : "text-tx"}`}>Reverse Mode</p>
            <p className="text-[11px] text-sub">Count up · break = focus ÷ 5</p>
          </div>
        </div>
        {/* Toggle pill */}
        <div className={`relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0 ${reverseMode ? "bg-accent" : "bg-ring"}`}>
          <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${reverseMode ? "translate-x-4" : "translate-x-0"}`} />
        </div>
      </button>
    </div>
  )
}