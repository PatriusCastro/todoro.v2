"use client"

import { colors } from "../../lib/theme"

interface TimerRingProps {
  minutes: number; seconds: number; progress: number
  label: string; spentLabel: string; size?: number; color?: string
}

export default function TimerRing({ minutes, seconds, progress, label, spentLabel, size = 220, color }: TimerRingProps) {
  const cx    = size / 2
  const r     = cx - 18
  const C     = 2 * Math.PI * r
  const stroke = color ?? colors.accent
  const glow   = color ? "rgba(81,207,102,0.35)" : colors.accentGlow

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--ring)" strokeWidth={12} />
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={stroke} strokeWidth={12} strokeOpacity={0.12}
          strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - progress)} />
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={stroke} strokeWidth={8}
          strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - progress)}
          style={{ transition: "stroke-dashoffset 1s linear", filter: `drop-shadow(0 0 10px ${glow})` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <span className="text-[11px] font-bold tracking-widest uppercase text-sub">{label}</span>
        <span className="font-black tracking-tighter leading-none text-tx tabular-nums"
          style={{ fontSize: size < 180 ? "2rem" : size < 260 ? "2.75rem" : "3.5rem" }}>
          {minutes}:{seconds.toString().padStart(2, "0")}
        </span>
        <span className="text-[11px] text-sub">{spentLabel}</span>
      </div>
    </div>
  )
}