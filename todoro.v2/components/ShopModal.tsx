"use client"

import { createPortal } from "react-dom"
import { HiXMark, HiFire, HiStar, HiBolt } from "react-icons/hi2"

interface ShopModalProps {
  dark: boolean
  points: number
  level: number
  levelInto: number
  levelSpan: number
  freezes: number
  freezeCost: number
  canRestore: boolean
  onBuyFreeze: () => void
  onRestore: () => void
  onClose: () => void
}

export default function ShopModal({
  dark, points, level, levelInto, levelSpan, freezes, freezeCost, canRestore,
  onBuyFreeze, onRestore, onClose,
}: ShopModalProps) {
  const canAfford = points >= freezeCost
  const levelPct  = Math.min(100, Math.round((levelInto / levelSpan) * 100))

  return createPortal(
    <div className={dark ? "dark" : ""}>
      <div
        className="fixed inset-0 z-9999 flex items-end md:items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div className="w-full max-w-md bg-surface border border-border rounded-3xl flex flex-col gap-4 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.5)] max-h-[90dvh] overflow-y-auto">

          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="font-black text-lg text-tx">Rewards</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-surface2 text-sub hover:text-tx flex items-center justify-center transition-colors">
              <HiXMark size={16} />
            </button>
          </div>

          {/* Level progress */}
          <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface2 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-tx">Level {level}</span>
              <span className="text-xs text-sub">{levelInto} / {levelSpan} to next</span>
            </div>
            <div className="h-2 rounded-full bg-ring overflow-hidden">
              <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${levelPct}%` }} />
            </div>
          </div>

          {/* Balance */}
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface2 px-4 py-3">
            <div className="flex items-center gap-2.5 flex-1">
              <HiStar size={18} color="#FFBA00" />
              <div>
                <p className="text-[11px] font-bold text-sub uppercase tracking-wider">Balance</p>
                <p className="text-2xl font-black text-tx leading-none mt-0.5">{points} <span className="text-sm font-semibold text-sub">pts</span></p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold text-sub uppercase tracking-wider">Freezes</p>
              <p className="text-2xl font-black text-tx leading-none mt-0.5">{freezes}</p>
            </div>
          </div>

          {/* Restore prompt (only when a streak is recoverable) */}
          {canRestore && (
            <div className="flex flex-col gap-2 rounded-2xl border border-priority-low/40 bg-priority-low/5 px-4 py-3">
              <div className="flex items-center gap-2">
                <HiFire size={16} className="text-priority-low" />
                <span className="text-sm font-black text-tx">Your streak broke</span>
              </div>
              <p className="text-xs text-sub">Use a Streak Freeze to bridge the day you missed and bring your streak back.</p>
              <button
                onClick={onRestore}
                disabled={freezes < 1}
                className="mt-1 py-2.5 rounded-xl bg-priority-low text-white text-sm font-black hover:bg-[#42c956] disabled:opacity-40 transition-all">
                {freezes < 1 ? "No freezes — buy one below" : "Restore streak (1 freeze)"}
              </button>
            </div>
          )}

          {/* Streak Freeze item */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                <HiFire size={20} className="text-accent" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black text-tx">Streak Freeze</p>
                <p className="text-xs text-sub mt-0.5">A ticket that restores your streak after a missed day. Stock up so a busy day never breaks your run.</p>
              </div>
            </div>
            <button
              onClick={onBuyFreeze}
              disabled={!canAfford}
              className="py-2.5 rounded-xl bg-accent text-white text-sm font-black hover:bg-accent-hover disabled:opacity-40 transition-all">
              {canAfford ? `Buy for ${freezeCost} pts` : `Need ${freezeCost} pts`}
            </button>
          </div>

          {/* How points work */}
          <div className="flex items-start gap-2 px-1">
            <HiBolt size={13} className="text-sub mt-0.5 shrink-0" />
            <p className="text-[11px] text-sub leading-relaxed">
              Earn points every focus session — 1 per focused minute, plus up to a 70% bonus as your streak grows.
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
