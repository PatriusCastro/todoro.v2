"use client"

type Phase = "focus" | "break"

interface TimerControlsProps {
  running: boolean; phase: Phase
  onToggle: () => void; onReset: () => void; onSkip: () => void
}

export default function TimerControls({ running, phase, onToggle, onReset, onSkip }: TimerControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      <IconBtn onClick={onReset} label="Reset">
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
        </svg>
      </IconBtn>

      <button onClick={onToggle}
        className={`flex items-center gap-2 px-8 py-3 rounded-full text-white text-sm font-black min-w-27.5 justify-center
          active:scale-95 transition-all duration-150
          ${phase === "focus"
            ? "bg-accent shadow-[0_4px_20px_rgba(108,99,255,0.4)] hover:bg-accent-hover"
            : "bg-priority-low shadow-[0_4px_20px_rgba(81,207,102,0.3)] hover:bg-[#42c956]"}`}>
        {running
          ? <><svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pause</>
          : <><svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg> {phase === "focus" ? "Start" : "Rest"}</>
        }
      </button>

      <IconBtn onClick={onSkip} label={`Skip to ${phase === "focus" ? "break" : "focus"}`}>
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>
        </svg>
      </IconBtn>
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