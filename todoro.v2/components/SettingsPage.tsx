"use client"

import { useRef } from "react"
import { HiUser, HiMoon, HiSun, HiComputerDesktop, HiSpeakerWave, HiArrowUpTray, HiArrowDownTray, HiBell, HiForward, HiTrash } from "react-icons/hi2"
import { MdColorLens } from "react-icons/md";
import { FaBullseye } from "react-icons/fa"
import Panel from "./shared/Panel"
import Toggle from "./shared/Toggle"
import Stepper from "./shared/Stepper"
import Segmented, { type SegmentedOption } from "./shared/Segmented"

type Theme = "system" | "light" | "dark"

interface SettingsPageProps {
  userName: string;  onUserName: (v: string) => void
  theme: Theme;      onTheme:    (v: Theme) => void
  sound: boolean;    onSound:    (v: boolean) => void
  dailyGoal: number; onDailyGoal:(v: number) => void
  avatarUrl: string; onAvatarUrl:(v: string) => void
  accentTheme: string; onAccentTheme: (v: string) => void
  notifications: boolean; onNotifications: (v: boolean) => void
  autoStart: boolean; onAutoStart: (v: boolean) => void
}

const THEMES: SegmentedOption<Theme>[] = [
  { value: "system", label: <><HiComputerDesktop size={15} /> System</> },
  { value: "light",  label: <><HiSun size={15} /> Light</> },
  { value: "dark",   label: <><HiMoon size={15} /> Dark</> },
]

export default function SettingsPage({
  userName, onUserName, theme, onTheme, sound, onSound, dailyGoal, onDailyGoal,
  avatarUrl, onAvatarUrl, accentTheme, onAccentTheme, notifications, onNotifications,
  autoStart, onAutoStart
}: SettingsPageProps) {
  const fileRef   = useRef<HTMLInputElement>(null)
  const importRef = useRef<HTMLInputElement>(null)

  const handleNotificationsToggle = async (v: boolean) => {
    if (v && "Notification" in window && Notification.permission !== "granted") {
      const result = await Notification.requestPermission()
      if (result !== "granted") return   // don't enable if user denied
    }
    onNotifications(v)
  }


  const ACCENT_THEMES = [
  { id: "blue",    color: "#5B8CFF", label: "Blue (default)" },
  { id: "violet",  color: "#8B5CF6", label: "Violet" },
  { id: "rose",    color: "#F43F5E", label: "Rose" },
  { id: "amber",   color: "#F59E0B", label: "Amber" },
  { id: "emerald", color: "#10B981", label: "Emerald" },
  { id: "cyan",    color: "#06B6D4", label: "Cyan" },
  { id: "pink",    color: "#EC4899", label: "Pink" },
  { id: "orange",  color: "#F97316", label: "Orange" },
  { id: "gray",    color: "#6B7280", label: "Gray"}
]

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const src = ev.target?.result as string
      // Downscale so avatars stay tiny and don't blow the localStorage quota
      const img = new Image()
      img.onload = () => {
        const MAX   = 256
        const scale = Math.min(MAX / img.width, MAX / img.height, 1)
        const canvas = document.createElement("canvas")
        canvas.width  = Math.round(img.width  * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext("2d")
        if (!ctx) { onAvatarUrl(src); return }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        onAvatarUrl(canvas.toDataURL("image/jpeg", 0.85))
      }
      img.onerror = () => onAvatarUrl(src)
      img.src = src
    }
    reader.readAsDataURL(file)
  }

  const handleExport = () => {
    const data: Record<string, string> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith("todoro:")) data[key] = localStorage.getItem(key) ?? ""
    }
    const payload = JSON.stringify({ app: "todoro", version: 1, exportedAt: Date.now(), data }, null, 2)
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }))
    const a = document.createElement("a")
    a.href = url
    a.download = `todoro-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleResetData = () => {
    if (!confirm("This erases ALL Todoro data on this device — tasks, history, settings, everything. This can't be undone. Continue?")) return
    try {
      const keys: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith("todoro:")) keys.push(k)
      }
      keys.forEach(k => localStorage.removeItem(k))
    } catch {}
    location.reload()
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string)
        const data   = parsed?.data ?? parsed
        const keys   = data && typeof data === "object"
          ? Object.keys(data).filter(k => k.startsWith("todoro:")) : []
        if (!keys.length) throw new Error("invalid")
        if (!confirm("Importing will replace all current Todoro data on this device. Continue?")) return
        keys.forEach(k => localStorage.setItem(k, typeof data[k] === "string" ? data[k] : JSON.stringify(data[k])))
        location.reload()
      } catch {
        alert("That doesn't look like a valid Todoro backup file.")
      }
    }
    reader.readAsText(file)
  }

  const initials = userName ? userName.slice(0, 2).toUpperCase() : "–"

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold text-tx">Settings</h1>
        <p className="text-sm text-sub mt-0.5">Make Todoro yours</p>
      </div>

      <Section label="Profile">
        <div className="flex items-center gap-4 px-4 py-4">
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-border bg-surface2 flex items-center justify-center">
              {avatarUrl
                ? <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
                : <span className="text-xl font-semibold text-sub">{initials}</span>
              }
            </div>
            <button onClick={() => fileRef.current?.click()}
              aria-label="Upload a profile photo"
              className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-accent border-2 border-surface
                flex items-center justify-center hover:bg-accent-hover transition-colors">
              <HiArrowUpTray size={10} color="white" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <span className="text-xs font-bold text-sub">Photo</span>
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
        <div className="flex flex-col gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <HiSun size={18} className="text-sub shrink-0" />
            <span className="flex-1 text-sm font-medium text-tx">Theme</span>
          </div>
          <Segmented options={THEMES} value={theme} onChange={onTheme} label="Theme" />
        </div>
        <div className="flex flex-col gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <MdColorLens size={18} className="text-sub shrink-0" />
            <span className="flex-1 text-sm font-medium text-tx">Accent Color</span>
            <span className="text-xs text-sub">
              {ACCENT_THEMES.find(t => t.id === accentTheme)?.label ?? accentTheme}
            </span>
          </div>
          <div className="flex flex-wrap gap-2.5 pl-8">
            {ACCENT_THEMES.map(({ id, color, label }) => (
              <button key={id} onClick={() => onAccentTheme(id)} title={label} aria-label={label}
                className="w-7 h-7 rounded-full transition-all duration-100 active:scale-90"
                style={{
                  backgroundColor: color,
                  outline: accentTheme === id ? `2px solid ${color}` : "none",
                  outlineOffset: "2px",
                  transform: accentTheme === id ? "scale(1.18)" : "scale(1)",
                }} />
            ))}
          </div>
        </div>
      </Section>

      <Section label="Focus">
        <ToggleRow label="Sound Effects" icon={<HiSpeakerWave size={18} className="text-sub shrink-0" />} value={sound} onChange={onSound} />
        <ToggleRow label="Push Notifications" icon={<HiBell size={18} className="text-sub shrink-0" />} value={notifications} onChange={handleNotificationsToggle} />
        <ToggleRow label="Auto-start breaks & focus" icon={<HiForward size={18} className="text-sub shrink-0" />} value={autoStart} onChange={onAutoStart} />
        <div className="flex items-center gap-3 px-4 py-4">
          <FaBullseye size={18} className="text-sub shrink-0" />
          <div className="flex-1">
            <span className="text-sm font-medium text-tx">Daily Session Goal</span>
            <p className="text-xs text-sub">Sessions you aim for each day</p>
          </div>
          <Stepper value={dailyGoal} onChange={onDailyGoal} min={1} max={12} unit="sessions" />
        </div>
      </Section>

      <Section label="Data">
        <button onClick={handleExport}
          className="flex items-center gap-3 px-4 py-4 w-full text-left hover:bg-surface2 transition-colors">
          <HiArrowDownTray size={18} className="text-sub shrink-0" />
          <div className="flex-1">
            <span className="text-sm font-medium text-tx">Export backup</span>
            <p className="text-xs text-sub">Download your tasks, history &amp; settings as a file</p>
          </div>
        </button>
        <button onClick={() => importRef.current?.click()}
          className="flex items-center gap-3 px-4 py-4 w-full text-left hover:bg-surface2 transition-colors">
          <HiArrowUpTray size={18} className="text-sub shrink-0" />
          <div className="flex-1">
            <span className="text-sm font-medium text-tx">Import backup</span>
            <p className="text-xs text-sub">Restore from a file — replaces current data</p>
          </div>
        </button>
        <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImport} />
        <button onClick={handleResetData}
          className="flex items-center gap-3 px-4 py-4 w-full text-left hover:bg-priority-high/5 transition-colors">
          <HiTrash size={18} className="text-priority-high shrink-0" />
          <div className="flex-1">
            <span className="text-sm font-medium text-priority-high">Reset all data</span>
            <p className="text-xs text-sub">Erase all tasks, history &amp; settings on this device</p>
          </div>
        </button>
      </Section>

      <Section label="About">
        <InfoRow label="App"     value="Todoro" />
        <InfoRow label="Version" value="2.7.0" />
        <InfoRow label="Stack"   value="Next.js + PWA" />
      </Section>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-bold text-sub px-1">{label}</span>
      <Panel bare className="overflow-hidden divide-y divide-border">
        {children}
      </Panel>
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
      <Toggle checked={value} onChange={onChange} label={label} />
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