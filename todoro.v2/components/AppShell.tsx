"use client"

import { useIsTablet } from "../hooks/useMediaQuery"

type Tab = "home" | "tasks" | "timer" | "settings"

interface AppShellProps {
  children: React.ReactNode; activeTab: Tab
  onTabChange: (tab: Tab) => void; dark: boolean
  userName: string; streak: number; running: boolean
}

const NAV: { id: Tab; label: string }[] = [
  { id: "home",     label: "Home"     },
  { id: "tasks",    label: "Tasks"    },
  { id: "timer",    label: "Timer"    },
  { id: "settings", label: "Settings" },
]

export default function AppShell({ children, activeTab, onTabChange, dark, userName, streak, running }: AppShellProps) {
  const isTablet  = useIsTablet()
  const initials = userName ? userName.slice(0, 2).toUpperCase() : "–"

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-dvh bg-bg text-tx flex flex-col">

        {/* Top nav */}
        {isTablet && (
          <header className="fixed top-0 inset-x-0 z-50 h-14 bg-surface/80 backdrop-blur-xl border-b border-border flex items-center px-6 gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>
                </svg>
              </div>
              <span className="font-black text-sm tracking-tight text-tx">Todoro</span>
            </div>

            {/* Nav links */}
            <nav className="flex items-center justify-center gap-1 flex-1">
              {NAV.map(({ id, label }) => {
                const active = activeTab === id
                return (
                  <button key={id} onClick={() => onTabChange(id)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200
                      ${active ? "bg-accent text-white shadow-[0_2px_12px_rgba(108,99,255,0.35)]" : "text-sub hover:text-tx hover:bg-surface2"}`}>
                    {label}
                  </button>
                )
              })}
            </nav>

            {/* Right — timer status + user */}
            <div className="flex items-center gap-3 shrink-0">
              {running && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-priority-low/10 border border-priority-low/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-priority-low animate-pulse" />
                  <span className="text-xs font-semibold text-priority-low">Focusing</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="text-right hidden lg:block">
                  <p className="text-xs font-bold text-tx leading-none">{userName}</p>
                  <p className="text-[10px] text-sub">{streak} day streak</p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-accent/15 flex items-center justify-center text-accent text-xs font-black border border-accent/20">
                  {initials}
                </div>
              </div>
            </div>
          </header>
        )}

        {/* Content */}
        <main className={`flex-1 overflow-y-auto ${isTablet ? "pt-14" : "pb-16"}`}>
          <div className="w-full max-w-2xl mx-auto px-4 md:px-6 py-6">
            {children}
          </div>
        </main>

        {/* Bottom nav — mobile only */}
        {!isTablet && (
          <nav className="fixed bottom-0 inset-x-0 z-50 flex justify-around items-center h-16 bg-surface/90 backdrop-blur-xl border-t border-border pb-[env(safe-area-inset-bottom)]">
            {NAV.map(({ id, label }) => {
              const active = activeTab === id
              return (
                <button key={id} onClick={() => onTabChange(id)}
                  className={`flex flex-col items-center gap-1 px-4 py-1 transition-colors duration-200 ${active ? "text-accent" : "text-sub"}`}>
                  <NavIcon id={id} active={active} />
                  <span className="text-[10px] font-semibold">{label}</span>
                </button>
              )
            })}
          </nav>
        )}

      </div>
    </div>
  )
}

function NavIcon({ id, active }: { id: Tab; active: boolean }) {
  const s = active ? "currentColor" : "none"
  switch (id) {
    case "home":     return <svg width="20" height="20" viewBox="0 0 24 24" fill={s} stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22" fill="none"/></svg>
    case "tasks":    return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
    case "timer":    return <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? "rgba(108,99,255,0.15)" : "none"} stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>
    case "settings": return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" fill={s}/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  }
}