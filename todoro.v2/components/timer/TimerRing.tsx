"use client"

import { colors } from "../../lib/theme"

interface TimerRingProps {
  minutes: number; seconds: number; progress: number
  label: string; spentLabel: string; size?: number; color?: string
}

export default function TimerRing({ minutes, seconds, progress, label, spentLabel, size = 260, color }: TimerRingProps) {
  const cx     = size / 2
  const r      = cx - 20
  const C      = 2 * Math.PI * r
  const stroke = color ?? colors.accent

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--ring)" strokeWidth={12} />
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={stroke} strokeWidth={9}
          strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - progress)}
          style={{ transition: "stroke-dashoffset 1s linear" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <span className="text-[11px] font-bold tracking-widest uppercase text-sub">{label}</span>
        <span className="font-black tracking-tighter leading-none text-tx tabular-nums"
          style={{ fontSize: size < 200 ? "2.25rem" : size < 280 ? "3rem" : "3.75rem" }}>
          {minutes}:{seconds.toString().padStart(2, "0")}
        </span>
        <span className="text-[11px] text-sub">{spentLabel}</span>
      </div>
    </div>
  )
}