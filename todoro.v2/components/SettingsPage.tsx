"use client"

interface SettingsPageProps {
  userName: string; onUserName: (v: string) => void
  dark: boolean; onDark: (v: boolean) => void
  sound: boolean; onSound: (v: boolean) => void
  dailyGoal: number; onDailyGoal: (v: number) => void
}

export default function SettingsPage({ userName, onUserName, dark, onDark, sound, onSound, dailyGoal, onDailyGoal }: SettingsPageProps) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-tx">Settings</h1>
        <p className="text-sm text-sub mt-0.5">Make Todoro yours</p>
      </div>

      <Section label="Profile">
        <div className="flex items-center gap-3 px-4 py-4">
          <Icon><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></Icon>
          <span className="flex-1 text-sm font-medium text-tx">Your Name</span>
          <input value={userName} onChange={e => onUserName(e.target.value)}
            placeholder="Enter your name"
            className="w-36 bg-surface2 border border-border rounded-xl px-3 py-1.5 text-sm text-tx text-right outline-none focus:border-accent transition-colors" />
        </div>
      </Section>

      <Section label="Appearance">
        <ToggleRow label="Dark Mode" onChange={onDark} value={dark}>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </ToggleRow>
      </Section>

      <Section label="Focus">
        <ToggleRow label="Sound Effects" onChange={onSound} value={sound}>
          <path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
        </ToggleRow>
        <StepperRow label="Daily Session Goal" value={dailyGoal} onChange={onDailyGoal} min={1} max={12} step={1} unit="sessions">
          <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="currentColor"/>
        </StepperRow>
      </Section>

      <Section label="About">
        <InfoRow label="App"        value="Todoro" />
        <InfoRow label="Version"    value="2.0.0" />
        <InfoRow label="Stack"      value="Next.js + PWA" />
      </Section>
    </div>
  )
}

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-sub shrink-0">
      {children}
    </svg>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-bold text-sub uppercase tracking-widest px-1">{label}</span>
      <div className="rounded-2xl border border-border bg-surface overflow-hidden divide-y divide-border">{children}</div>
    </div>
  )
}

function ToggleRow({ label, value, onChange, children }: { label: string; value: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-4">
      <Icon>{children}</Icon>
      <span className="flex-1 text-sm font-medium text-tx">{label}</span>
      <button onClick={() => onChange(!value)}
        className={`relative w-12 h-6 rounded-full transition-all duration-300 ${value ? "bg-accent" : "bg-border"}`}>
        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300 ${value ? "left-6" : "left-0.5"}`} />
      </button>
    </div>
  )
}

function StepperRow({ label, value, onChange, min, max, step, unit, children }: {
  label: string; value: number; onChange: (v: number) => void
  min: number; max: number; step: number; unit: string; children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-4">
      <Icon>{children}</Icon>
      <span className="flex-1 text-sm font-medium text-tx">{label}</span>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min}
          className="w-7 h-7 rounded-xl border border-border text-sub flex items-center justify-center font-bold hover:border-accent/50 hover:text-tx disabled:opacity-30 transition-all">−</button>
        <span className="text-sm font-black text-tx w-20 text-center tabular-nums">{value} <span className="text-xs font-normal text-sub">{unit}</span></span>
        <button onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max}
          className="w-7 h-7 rounded-xl border border-border text-sub flex items-center justify-center font-bold hover:border-accent/50 hover:text-tx disabled:opacity-30 transition-all">+</button>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center px-4 py-4">
      <span className="flex-1 text-sm font-medium text-tx">{label}</span>
      <span className="text-sm text-sub">{value}</span>
    </div>
  )
}