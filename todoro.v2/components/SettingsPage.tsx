"use client"

import { useRef, useState } from "react"
import { HiUser, HiMoon, HiSun, HiComputerDesktop, HiSpeakerWave, HiArrowUpTray, HiArrowDownTray, HiBell, HiForward, HiTrash, HiPlay, HiCloudArrowUp, HiArrowRightOnRectangle, HiTrophy } from "react-icons/hi2"
import { MdColorLens } from "react-icons/md";
import { FaBullseye } from "react-icons/fa"
import Panel from "./shared/Panel"
import Toggle from "./shared/Toggle"
import Stepper from "./shared/Stepper"
import Segmented, { type SegmentedOption } from "./shared/Segmented"
import { adjustmentNote, parseHex, type AccentSet } from "../lib/accent"
import { applyPayload, clearAll, downloadBackup, exportPayload, readPayload } from "../lib/backup"
import { clearMeta } from "../lib/sync/state"
import { type AuthApi } from "../lib/sync/auth"
import { type SyncApi } from "../lib/sync/engine"
import AccountSheet from "./AccountSheet"
import ConfirmModal from "./shared/ConfirmModal"

function relativeTime(at: number) {
  const secs = Math.max(0, Math.round((Date.now() - at) / 1000))
  if (secs < 10)   return "just now"
  if (secs < 60)   return `${secs}s ago`
  if (secs < 3600) return `${Math.round(secs / 60)}m ago`
  return `${Math.round(secs / 3600)}h ago`
}
import { ALERT_SOUNDS, MAX_CUSTOM_BYTES, playAlert, readAudioFile, stopAlert, type AlertSound } from "../lib/sound"

type Theme = "system" | "light" | "dark"

interface SettingsPageProps {
  userName: string;  onUserName: (v: string) => void
  theme: Theme;      onTheme:    (v: Theme) => void
  sound: boolean;    onSound:    (v: boolean) => void
  alertSound: AlertSound;   onAlertSound:  (v: AlertSound) => void
  alertVolume: number;      onAlertVolume: (v: number) => void
  alertCustom: string | null; onAlertCustom: (v: string | null) => void
  dailyGoal: number; onDailyGoal:(v: number) => void
  avatarUrl: string; onAvatarUrl:(v: string) => void
  accentTheme: string; onAccentTheme: (v: string) => void
  accentCustom: AccentSet | null; onAccentCustom: (rawHex: string) => void
  notifications: boolean; onNotifications: (v: boolean) => void
  autoStart: boolean; onAutoStart: (v: boolean) => void
  leaderboard: boolean; onLeaderboard: (v: boolean) => void
  /** Owned by app/page.tsx — the engine has to outlive this tab. */
  auth: AuthApi
  sync: SyncApi
}

const THEMES: SegmentedOption<Theme>[] = [
  { value: "system", label: <><HiComputerDesktop size={15} /> System</> },
  { value: "light",  label: <><HiSun size={15} /> Light</> },
  { value: "dark",   label: <><HiMoon size={15} /> Dark</> },
]

export default function SettingsPage({
  userName, onUserName, theme, onTheme, sound, onSound, dailyGoal, onDailyGoal,
  alertSound, onAlertSound, alertVolume, onAlertVolume, alertCustom, onAlertCustom,
  avatarUrl, onAvatarUrl, accentTheme, onAccentTheme, accentCustom, onAccentCustom,
  notifications, onNotifications, autoStart, onAutoStart,
  leaderboard, onLeaderboard,
  auth, sync
}: SettingsPageProps) {
  const fileRef   = useRef<HTMLInputElement>(null)
  const importRef = useRef<HTMLInputElement>(null)
  const soundRef  = useRef<HTMLInputElement>(null)
  const [soundError, setSoundError] = useState<string | null>(null)
  const [accountOpen, setAccountOpen] = useState(false)
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const [confirmReset,   setConfirmReset]   = useState(false)
  const [pendingImport,  setPendingImport]  = useState<Record<string, string> | null>(null)

  const preview = () => playAlert({ sound: alertSound, custom: alertCustom, volume: alertVolume })

  const handleSoundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""            // let the same file be picked again after an error
    if (!file) return
    setSoundError(null)
    try {
      const dataUrl = await readAudioFile(file)
      onAlertCustom(dataUrl)
      onAlertSound("custom")
      stopAlert()
      playAlert({ sound: "custom", custom: dataUrl, volume: alertVolume })
    } catch (err) {
      setSoundError(err instanceof Error ? err.message : "Couldn't use that file.")
    }
  }

  // The hex field is free text while you type; it only commits once it parses.
  const [hexDraft, setHexDraft] = useState((accentCustom?.raw ?? "#7C3AED").toUpperCase())
  const draftHex   = parseHex(hexDraft)
  const customSwatch = accentCustom?.raw ?? "#7c3aed"
  const commitHex = (v: string) => {
    setHexDraft(v)
    const ok = parseHex(v)
    if (ok) onAccentCustom(ok)
  }

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
    downloadBackup(exportPayload())
  }

  /**
   * Resetting has to sign out too. The Supabase session is stored under
   * `todoro-auth` — dashed, deliberately outside the `todoro:` namespace so it
   * can never land in an exported backup — which means clearAll() leaves it
   * untouched. Without the sign-out, the next sync would pull the whole account
   * straight back down and "this can't be undone" would be a lie.
   */
  const doReset = async () => {
    setConfirmReset(false)
    clearAll()
    clearMeta()
    if (auth.status === "signed-in") await auth.signOut()
    location.reload()
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Reset the input, or picking the same file twice does nothing.
    e.target.value = ""
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      let data: Record<string, string> | null = null
      try {
        data = readPayload(JSON.parse(ev.target?.result as string))
      } catch {
        data = null
      }
      if (!data) {
        alert("That doesn't look like a valid Todoro backup file.")
        return
      }
      setPendingImport(data)
    }
    reader.readAsText(file)
  }

  /**
   * The shadow describes the state *before* the import, so leaving it in place
   * would make the next sync diff the imported data against something unrelated
   * — either pushing a huge spurious mutation or tripping the mass-delete
   * guard. Clearing it forces a clean re-derive against a fresh pull.
   */
  const applyImport = () => {
    if (!pendingImport) return
    applyPayload(pendingImport)
    clearMeta()
    setPendingImport(null)
    location.reload()
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
            <span className="text-caption font-extrabold uppercase tracking-wider text-tx">Photo</span>
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

      {/* Sign-in lives here and nowhere else. Putting it in Onboarding would ask
          for an email before the user has seen a task, which contradicts the
          whole "no account needed" premise. */}
      <Section label="Account">
        {auth.status === "unconfigured" ? (
          <InfoRow label="Sync" value="Unavailable on this build" />
        ) : auth.status === "signed-in" ? (
          <>
            <InfoRow label="Signed in" value={auth.user?.email ?? "—"} />
            <div className="flex items-center gap-3 px-4 py-4">
              <HiCloudArrowUp size={18} className="text-sub shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-tx">Sync</span>
                <span className={`block text-xs ${sync.state === "error" ? "text-priority-high" : "text-sub"}`}>
                  {sync.state === "syncing" ? "Syncing…"
                    : sync.state === "error" ? (sync.error ?? "Sync failed")
                    : sync.lastSyncedAt ? `Backed up ${relativeTime(sync.lastSyncedAt)}`
                    : "Waiting to back up"}
                </span>
              </span>
              <button onClick={() => void sync.syncNow()}
                disabled={sync.state === "syncing"}
                className="shrink-0 min-h-11 px-3.5 rounded-control border border-border text-meta font-extrabold
                  text-tx hover:border-accent/40 disabled:opacity-40 transition-colors">
                Sync now
              </button>
            </div>
            {/* The only switch in the app that makes data leave the account,
                so it says what it publishes rather than just naming itself. */}
            <ToggleRow
              label="Weekly leaderboard"
              sub={leaderboard
                ? "Your name and weekly focus time are visible to others who joined"
                : "Off — publishes your name and weekly focus time when on"}
              icon={<HiTrophy size={18} className="text-sub shrink-0" />}
              value={leaderboard}
              onChange={onLeaderboard} />
            <button onClick={() => setConfirmSignOut(true)}
              className="flex items-center gap-3 px-4 py-4 w-full text-left hover:bg-surface2 transition-colors">
              <HiArrowRightOnRectangle size={18} className="text-sub shrink-0" />
              <span className="flex-1 text-sm font-medium text-tx">Sign out</span>
              <span className="text-xs text-sub">Keeps this device&rsquo;s data</span>
            </button>
          </>
        ) : (
          <button onClick={() => setAccountOpen(true)}
            disabled={auth.status === "loading"}
            className="flex items-center gap-3 px-4 py-4 w-full text-left hover:bg-surface2 transition-colors disabled:opacity-50">
            <HiCloudArrowUp size={18} className="text-sub shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-tx">Sync across devices</span>
              <span className="block text-xs text-sub">
                Off — everything stays on this device
              </span>
            </span>
            <span className="text-sm font-semibold text-accent shrink-0">Sign in</span>
          </button>
        )}
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
          <div className="flex flex-wrap gap-2 pl-8">
            {ACCENT_THEMES.map(({ id, color, label }) => (
              <button key={id} onClick={() => onAccentTheme(id)} title={label} aria-label={label}
                aria-pressed={accentTheme === id}
                className="w-11 h-11 grid place-items-center rounded-control active:scale-90 transition-transform">
                <span className="w-7 h-7 rounded-pill block"
                  style={{
                    backgroundColor: color,
                    outline: accentTheme === id ? `2px solid ${color}` : "none",
                    outlineOffset: "2px",
                  }} />
              </button>
            ))}
          </div>

          {/* Custom colour — any hex, nudged until it reads on both grounds */}
          <div className={`flex items-center gap-3 pl-8 pr-1 py-3 rounded-control border transition-colors
            ${accentTheme === "custom" ? "border-tx" : "border-border"}`}>
            <label className="relative shrink-0 grid place-items-center cursor-pointer"
              title="Pick a custom accent colour">
              <span className="w-11 h-11 rounded-control border border-border block"
                style={{ backgroundColor: accentTheme === "custom" ? "var(--accent)" : customSwatch }} />
              <input type="color" value={customSwatch}
                aria-label="Pick a custom accent colour"
                onChange={e => commitHex(e.target.value.toUpperCase())}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer border-0 p-0" />
            </label>
            <div className="flex-1 min-w-0">
              <p className="text-meta font-bold text-tx">Your own colour</p>
              <p className="text-caption text-sub text-pretty">{adjustmentNote(hexDraft)}</p>
            </div>
            <input value={hexDraft}
              aria-label="Accent hex colour"
              placeholder="#7C3AED"
              onChange={e => commitHex(e.target.value)}
              onFocus={() => { if (draftHex && accentCustom) onAccentTheme("custom") }}
              className={`w-26 min-h-11 shrink-0 px-2 rounded-control border bg-transparent text-tx
                text-meta font-bold tracking-wider uppercase text-center outline-none transition-colors
                ${draftHex ? "border-border focus:border-accent" : "border-priority-high"}`} />
          </div>
        </div>
      </Section>

      <Section label="Alert sound">
        <ToggleRow label="Sound Effects" icon={<HiSpeakerWave size={18} className="text-sub shrink-0" />} value={sound} onChange={onSound} />

        {sound && (
          <div className="flex flex-col gap-3 px-4 py-4">
            <div className="flex items-center gap-3">
              <span className="flex-1 text-caption font-extrabold uppercase tracking-wider text-tx">
                Sound
              </span>
              <button onClick={preview}
                className="shrink-0 flex items-center gap-1.5 min-h-11 px-3.5 rounded-control border border-border
                  text-meta font-extrabold text-tx hover:border-accent hover:text-accent transition-colors">
                <HiPlay size={14} /> Preview
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              {ALERT_SOUNDS.map(({ id, label, hint }) => {
                const active   = alertSound === id
                const disabled = id === "custom" && !alertCustom
                return (
                  <button key={id}
                    onClick={() => { if (!disabled) { onAlertSound(id); playAlert({ sound: id, custom: alertCustom, volume: alertVolume }) } }}
                    disabled={disabled}
                    aria-pressed={active}
                    className={`flex items-center gap-3 min-h-14 px-3.5 rounded-control border text-left
                      transition-colors disabled:opacity-40
                      ${active ? "border-accent bg-accent/10" : "border-border hover:border-accent/40"}`}>
                    <span className={`w-4.5 h-4.5 shrink-0 rounded-pill border-2 grid place-items-center
                      ${active ? "border-accent" : "border-border"}`}>
                      {active && <span className="w-2 h-2 rounded-pill bg-accent" />}
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-meta font-extrabold ${active ? "text-accent" : "text-tx"}`}>{label}</span>
                      <span className="block text-caption text-sub truncate">
                        {id === "custom" && !alertCustom ? "Upload a file to use this" : hint}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Upload */}
            <div className="flex items-center gap-2">
              <button onClick={() => soundRef.current?.click()}
                className="flex items-center gap-1.5 min-h-11 px-3.5 rounded-control border border-border
                  text-meta font-extrabold text-tx hover:border-accent hover:text-accent transition-colors">
                <HiArrowUpTray size={14} /> {alertCustom ? "Replace file" : "Upload sound"}
              </button>
              {alertCustom && (
                <button onClick={() => { onAlertCustom(null); if (alertSound === "custom") onAlertSound("chime") }}
                  className="min-h-11 px-3 text-meta font-extrabold text-priority-high hover:underline">
                  Remove
                </button>
              )}
            </div>
            <input ref={soundRef} type="file" accept="audio/*" className="hidden" onChange={handleSoundUpload} />
            <p className={`text-caption ${soundError ? "text-priority-high" : "text-sub"}`}>
              {soundError ??
                `Any audio file up to ${Math.round(MAX_CUSTOM_BYTES / 1024)} KB. Long files stop after 8 seconds.`}
            </p>

            {/* Volume */}
            <label className="flex items-center gap-3 pt-1">
              <span className="text-caption font-extrabold uppercase tracking-wider text-tx shrink-0">Volume</span>
              <input type="range" min={0} max={100} step={5}
                value={Math.round(alertVolume * 100)}
                onChange={e => onAlertVolume(Number(e.target.value) / 100)}
                onMouseUp={preview} onTouchEnd={preview}
                aria-label="Alert volume"
                className="flex-1 accent-accent min-h-11" />
              <span className="text-meta font-extrabold text-tx tabular-nums w-10 text-right shrink-0">
                {Math.round(alertVolume * 100)}
              </span>
            </label>
          </div>
        )}
      </Section>

      <Section label="Focus">
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
        <button onClick={() => setConfirmReset(true)}
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
        <InfoRow label="Version" value="2.30.0" />
        <InfoRow label="Stack"   value="Next.js + PWA" />
      </Section>

      {accountOpen && (
        <AccountSheet
          onClose={() => setAccountOpen(false)}
          sendCode={auth.sendCode}
          verifyCode={auth.verifyCode} />
      )}

      {confirmReset && (
        <ConfirmModal
          title="Erase everything on this device?"
          body={
            <>
              Every task, project, focus session and setting stored here is deleted.
              {auth.status === "signed-in" ? (
                <>
                  {" "}You&rsquo;ll also be signed out &mdash; otherwise the next sync would
                  simply download it all again.{" "}
                  <span className="font-bold text-tx">
                    Your account still has a copy
                  </span>
                  , so signing back in restores it.
                </>
              ) : (
                <> This device is the only copy. Export a backup first if you might want it.</>
              )}
            </>
          }
          confirmLabel="Erase"
          destructive
          onConfirm={() => { void doReset() }}
          onClose={() => setConfirmReset(false)} />
      )}

      {pendingImport && (
        <ConfirmModal
          title="Import this backup?"
          body={
            <>
              This replaces what&rsquo;s on this device with the{" "}
              <span className="font-bold text-tx">{Object.keys(pendingImport).length} items</span>{" "}
              in the file. Anything here that isn&rsquo;t in the backup is left alone.
            </>
          }
          confirmLabel="Import"
          onConfirm={applyImport}
          onClose={() => setPendingImport(null)} />
      )}

      {confirmSignOut && (
        <ConfirmModal
          title="Sign out of Todoro?"
          body={
            <>
              Your tasks, history and settings stay on this device &mdash; signing out
              never deletes anything. Sign back in with{" "}
              <span className="font-bold text-tx">{auth.user?.email ?? "the same email"}</span>{" "}
              any time to keep syncing.
            </>
          }
          confirmLabel="Sign out"
          destructive
          onConfirm={() => { setConfirmSignOut(false); void auth.signOut() }}
          onClose={() => setConfirmSignOut(false)} />
      )}
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-caption font-extrabold uppercase tracking-wider text-tx px-1">{label}</span>
      <Panel bare className="overflow-hidden divide-y divide-border">
        {children}
      </Panel>
    </div>
  )
}

function ToggleRow({ label, sub, icon, value, onChange }: {
  label: string; icon: React.ReactNode; value: boolean; onChange: (v: boolean) => void
  /** For a switch whose consequence isn't obvious from its label alone. */
  sub?: string
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-4">
      {icon}
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-tx">{label}</span>
        {sub && <span className="block text-xs text-sub mt-0.5">{sub}</span>}
      </span>
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