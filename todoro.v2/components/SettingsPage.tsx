"use client"

import { useRef } from "react"

interface SettingsPageProps {
  userName:   string; onUserName:  (v: string) => void
  dark:       boolean; onDark:     (v: boolean) => void
  sound:      boolean; onSound:    (v: boolean) => void
  dailyGoal:  number;  onDailyGoal:(v: number) => void
  avatarUrl:  string;  onAvatarUrl:(v: string) => void
}

export default function SettingsPage({
  userName, onUserName, dark, onDark, sound, onSound, dailyGoal, onDailyGoal,
  avatarUrl, onAvatarUrl,
}: SettingsPageProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => onAvatarUrl(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const initials = userName ? userName.slice(0, 2).toUpperCase() : "–"

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-tx">Settings</h1>
        <p className="text-sm text-sub mt-0.5">Make Todoro yours</p>
      </div>

      <Section label="Profile">
        {/* Avatar upload */}
        <div className="flex items-center gap-4 px-4 py-4">
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-border bg-accent/10 flex items-center justify-center">
              {avatarUrl
                ? <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
                : <span className="text-xl font-black text-accent">{initials}</span>
              }
            </div>
            <button onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-accent border-2 border-surface flex items-center justify-center hover:bg-accent-hover transition-colors">
              <svg width="10" height="10" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <span className="text-xs font-bold text-sub uppercase tracking-wide">Photo</span>
            <span className="text-xs text-sub">Tap the icon to upload</span>
            {avatarUrl && (
              <button onClick={() => onAvatarUrl("")}
                className="text-xs text-priority-high hover:underline text-left w-fit">
                Remove photo
              </button>
            )}
          </div>
        </div>

        {/* Name */}
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
        <InfoRow label="App"     value="Todoro" />
        <InfoRow label="Version" value="2.0.0" />
        <InfoRow label="Stack"   value="Next.js + PWA" />
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