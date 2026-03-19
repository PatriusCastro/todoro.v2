"use client"

import { HiArrowPath, HiPlay, HiPause, HiForward } from "react-icons/hi2"

type Phase = "focus" | "break" | "longbreak"

interface TimerControlsProps {
  running: boolean; phase: Phase
  onToggle: () => void; onReset: () => void; onSkip: () => void
}

function skipLabel(phase: Phase) {
  return phase === "focus" ? "Skip to break" : "Skip to focus"
}

export default function TimerControls({ running, phase, onToggle, onReset, onSkip }: TimerControlsProps) {
  const isBreak = phase !== "focus"
  return (
    <div className="flex items-center justify-center gap-4">
      <IconBtn onClick={onReset} label="Reset"><HiArrowPath size={16} /></IconBtn>

      <button onClick={onToggle}
        className={`flex items-center gap-2 px-8 py-3 rounded-full text-white text-sm font-black min-w-27.5 justify-center
          active:scale-95 transition-all duration-150
          ${!isBreak
            ? "bg-accent hover:bg-accent-hover"
            : "bg-priority-low hover:bg-[#42c956]"}`}>
        {running
          ? <><HiPause size={14} /> Pause</>
          : <><HiPlay size={14} /> {phase === "focus" ? "Start" : phase === "longbreak" ? "Long Rest" : "Rest"}</>
        }
      </button>

      <IconBtn onClick={onSkip} label={skipLabel(phase)}><HiForward size={16} /></IconBtn>
    </div>
  )
}

function IconBtn({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={label}
      className="w-10 h-10 rounded-full border border-border text-sub flex items-center justify-center
        hover:border-accent/50 hover:text-tx active:scale-95 transition-all duration-150">
      {children}
    </button>
  )
}