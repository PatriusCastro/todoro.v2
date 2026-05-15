"use client"

import { useRef } from "react"
import { HiUser, HiMoon, HiSpeakerWave, HiArrowUpTray, HiBolt } from "react-icons/hi2"
import { FaBullseye } from "react-icons/fa"

interface SettingsPageProps {
  userName: string;  onUserName: (v: string) => void
  dark: boolean;     onDark:     (v: boolean) => void
  sound: boolean;    onSound:    (v: boolean) => void
  dailyGoal: number; onDailyGoal:(v: number) => void
  avatarUrl: string; onAvatarUrl:(v: string) => void
  quickMode: boolean; onQuickMode: (v: boolean) => void
}

export default function SettingsPage({
  userName, onUserName, dark, onDark, sound, onSound, dailyGoal, onDailyGoal,
  avatarUrl, onAvatarUrl, quickMode, onQuickMode,
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
        <div className="flex items-center gap-4 px-4 py-4">
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-border bg-surface2 flex items-center justify-center">
              {avatarUrl
                ? <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
                : <span className="text-xl font-black text-sub">{initials}</span>
              }
            </div>
            <button onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-accent border-2 border-surface
                flex items-center justify-center hover:bg-accent-hover transition-colors">
              <HiArrowUpTray size={10} color="white" />
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
        <div className="flex items-center gap-3 px-4 py-4">
          <HiUser size={18} className="text-sub shrink-0" />
          <span className="flex-1 text-sm font-medium text-tx">Your Name</span>
          <input value={userName} onChange={e => onUserName(e.target.value)} placeholder="Enter your name"
            className="w-36 bg-surface2 border border-border rounded-xl px-3 py-1.5 text-sm text-tx text-right
              outline-none focus:border-accent transition-colors" />
        </div>
      </Section>

      <Section label="Appearance">
        <ToggleRow label="Dark Mode" icon={<HiMoon size={18} className="text-sub shrink-0" />} value={dark} onChange={onDark} />
      </Section>

      <Section label="Focus">
        <ToggleRow label="Sound Effects" icon={<HiSpeakerWave size={18} className="text-sub shrink-0" />} value={sound} onChange={onSound} />
        <ToggleRow label="Quick Mode" icon={<HiBolt size={18} className="text-sub shrink-0" />} value={quickMode} onChange={onQuickMode} />
        <div className="flex items-center gap-3 px-4 py-4">
          <FaBullseye size={18} className="text-sub shrink-0" />
          <span className="flex-1 text-sm font-medium text-tx">Daily Session Goal</span>
          <div className="flex items-center gap-2">
            <StepBtn onClick={() => onDailyGoal(Math.max(1, dailyGoal - 1))} disabled={dailyGoal <= 1}>−</StepBtn>
            <span className="text-sm font-black text-tx w-20 text-center tabular-nums">
              {dailyGoal} <span className="text-xs font-normal text-sub">sessions</span>
            </span>
            <StepBtn onClick={() => onDailyGoal(Math.min(12, dailyGoal + 1))} disabled={dailyGoal >= 12}>+</StepBtn>
          </div>
        </div>
      </Section>

      <Section label="About">
        <InfoRow label="App"     value="Todoro" />
        <InfoRow label="Version" value="2.0.0" />
        <InfoRow label="Stack"   value="Next.js + PWA" />
      </Section>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-bold text-sub uppercase tracking-widest px-1">{label}</span>
      <div className="rounded-2xl border border-border bg-surface overflow-hidden divide-y divide-border">
        {children}
      </div>
    </div>
  )
}

function ToggleRow({ label, icon, value, onChange }: {
  label: string; icon: React.ReactNode; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-4">
      {icon}
      <span className="flex-1 text-sm font-medium text-tx">{label}</span>
      <button onClick={() => onChange(!value)}
        className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${value ? "bg-accent" : "bg-border"}`}>
        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-300 ${value ? "left-6" : "left-0.5"}`} />
      </button>
    </div>
  )
}

function StepBtn({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-7 h-7 rounded-xl border border-border text-sub flex items-center justify-center font-bold
        hover:border-accent/40 hover:text-tx disabled:opacity-30 transition-all">
      {children}
    </button>
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