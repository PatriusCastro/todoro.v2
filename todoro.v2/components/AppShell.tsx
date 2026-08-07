"use client"

import { useState, useEffect } from "react"
import { useIsTablet } from "../hooks/useMediaQuery"
import { HiHome, HiOutlineHome, HiClipboardList, HiOutlineClipboardList, HiClock, HiOutlineClock, HiCog, HiOutlineCog } from "react-icons/hi"
import { HiPlus } from "react-icons/hi2"

type Tab   = "home" | "tasks" | "timer" | "settings"
type Phase = "focus" | "break" | "longbreak"

interface AppShellProps {
  children:      React.ReactNode
  activeTab:     Tab
  onTabChange:   (tab: Tab) => void
  dark:          boolean
  userName:      string
  streak:        number
  level:         number
  running:       boolean
  phase:         Phase
  hideNavbar?:   boolean
  avatarUrl?:    string
  onQuickAdd:    () => void
  /** Pending tasks — badged on the Tasks rail item. */
  openCount:     number
  /** Large-screen top bar copy; the caller already holds the state to build it. */
  headerTitle:    string
  headerSubtitle: string
  /** Suppresses the FAB while a modal or sheet owns the screen. */
  overlayOpen?:   boolean
}

const NAV: { id: Tab; label: string }[] = [
  { id: "home",     label: "Today"    },
  { id: "tasks",    label: "Tasks"    },
  { id: "timer",    label: "Timer"    },
  { id: "settings", label: "Settings" },
]

// The FAB only appears where creating a task is the obvious next action.
const FAB_TABS: Record<Tab, string | null> = {
  home: "Add", tasks: "New task", timer: null, settings: null,
}

function NavIcon({ id, active, size = 20 }: { id: Tab; active: boolean; size?: number }) {
  switch (id) {
    case "home":     return active ? <HiHome size={size} />          : <HiOutlineHome size={size} />
    case "tasks":    return active ? <HiClipboardList size={size} /> : <HiOutlineClipboardList size={size} />
    case "timer":    return active ? <HiClock size={size} />         : <HiOutlineClock size={size} />
    case "settings": return active ? <HiCog size={size} />           : <HiOutlineCog size={size} />
  }
}

function Avatar({ userName, avatarUrl, size, ring }: {
  userName: string; avatarUrl?: string; size: number; ring: string
}) {
  const initials = userName ? userName.slice(0, 2).toUpperCase() : "–"
  return (
    <div style={{ width: size, height: size }}
      className={`rounded-control overflow-hidden shrink-0 border-2 transition-colors duration-300 ${ring}`}>
      {avatarUrl
        ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
        : <div className="w-full h-full bg-surface2 flex items-center justify-center text-sub font-extrabold"
            style={{ fontSize: size * 0.32 }}>
            {initials}
          </div>
      }
    </div>
  )
}

export default function AppShell({
  children, activeTab, onTabChange, dark,
  userName, streak, level, running, phase, hideNavbar, avatarUrl,
  onQuickAdd, openCount, headerTitle, headerSubtitle, overlayOpen = false,
}: AppShellProps) {
  const isTablet = useIsTablet()
  const [mounted, setMounted] = useState(false)
  const [animKey, setAnimKey] = useState(0)
  useEffect(() => { setTimeout(() => setMounted(true), 50) }, [])

  const handleTabChange = (tab: Tab) => {
    if (tab === activeTab) return
    setAnimKey(k => k + 1)
    onTabChange(tab)
  }

  const avatarRing = running
    ? (phase === "focus" ? "border-accent" : "border-priority-low")
    : "border-border"

  const fabLabel  = FAB_TABS[activeTab]
  const showFab   = !isTablet && !hideNavbar && !overlayOpen && fabLabel !== null
  const showNewOnBar = activeTab === "home" || activeTab === "tasks"

  const pageInner = (
    <div key={animKey}
      style={{ animation: "tabenter 0.2s ease both" }}
      className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-6">
      {children}
    </div>
  )

  // ── Tablet / desktop: side rail + top bar ────────────────────────────────
  //
  // Focus view hides the rail and the bar, but it must do that by dropping two
  // children — never by returning a different tree. `pageInner` has to keep the
  // same position across the switch: move it and React unmounts the page, which
  // resets the very state that asked for focus view, which turns it back on.
  // That loop is what made this screen flicker on tablet and desktop.
  if (isTablet) {
    return (
      <div className="min-h-dvh bg-bg text-tx flex">

        {!hideNavbar && (
        <nav aria-label="Main" className="fixed inset-y-0 left-0 w-59 flex flex-col border-r border-border bg-bg z-40">
          <div className="px-5 pt-6 pb-5 border-b border-border">
            <div className="flex items-center gap-2">
              <img src={dark ? "/icons/todoro-light.png" : "/icons/todoro-dark.png"} alt="" className="w-5 h-5" />
              <span className="text-heading font-extrabold text-tx leading-none">Todoro</span>
            </div>
            <p className="text-caption uppercase tracking-wider text-sub mt-1.5">Focus &amp; tasks</p>
          </div>

          <div className="flex flex-col py-3">
            {NAV.map(({ id, label }) => {
              const active = activeTab === id
              const badge  = id === "tasks" && openCount > 0 ? String(openCount) : null
              return (
                <button key={id} onClick={() => handleTabChange(id)}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 w-full min-h-12 pr-5 text-lead font-extrabold
                    transition-colors duration-150 ${active ? "text-accent" : "text-tx hover:text-accent"}`}>
                  <span className={`w-1 h-6 rounded-chip shrink-0 ${active ? "bg-accent" : "bg-transparent"}`} />
                  <NavIcon id={id} active={active} size={19} />
                  <span className="flex-1 text-left">{label}</span>
                  {badge && (
                    <span className={`text-meta font-semibold tabular-nums ${active ? "text-accent" : "text-sub"}`}>
                      {badge}
                    </span>
                  )}
                  {id === "timer" && running && (
                    <span className="w-2 h-2 rounded-pill bg-priority-low shrink-0" />
                  )}
                </button>
              )
            })}
          </div>

          <button onClick={() => handleTabChange("settings")}
            className="mt-auto flex items-center gap-3 px-5 py-4 border-t border-border text-left hover:opacity-75 transition-opacity">
            <Avatar userName={userName} avatarUrl={avatarUrl} size={38} ring={avatarRing} />
            <span className="min-w-0">
              <span className="block text-meta font-extrabold text-tx leading-tight truncate">{userName}</span>
              <span className="block text-caption text-sub">Lv {level} · {streak}d streak</span>
            </span>
          </button>
        </nav>
        )}

        <div className={`flex-1 flex flex-col min-w-0 ${hideNavbar ? "" : "ml-59"}`}>
          {!hideNavbar && (
          <header className={`sticky top-0 z-30 flex items-center gap-4 px-6 py-3.5 border-b border-border bg-bg
            transition-opacity duration-500 ${mounted ? "opacity-100" : "opacity-0"}`}>
            <div className="min-w-0">
              <h1 className="text-heading font-extrabold text-tx leading-tight truncate">{headerTitle}</h1>
              <p className="text-meta text-sub truncate">{headerSubtitle}</p>
            </div>
            {showNewOnBar && (
              <button onClick={onQuickAdd}
                className="ml-auto shrink-0 inline-flex items-center justify-center gap-2 min-h-12 px-4 rounded-control
                  bg-accent text-white text-meta font-extrabold hover:bg-accent-hover active:scale-[0.98] transition-all duration-150">
                <HiPlus size={17} />
                New task
              </button>
            )}
          </header>
          )}
          <main className="flex-1">{pageInner}</main>
        </div>
      </div>
    )
  }

  // ── Phone: bottom tabs + contextual FAB ──────────────────────────────────
  return (
    <div className="min-h-dvh bg-bg text-tx flex flex-col">
      <main className={`flex-1 ${hideNavbar ? "" : "pb-32"}`}>{pageInner}</main>

      {showFab && (
        <button onClick={onQuickAdd}
          className={`fixed right-4 bottom-24 z-40 flex items-center gap-2 min-h-14 px-5
            rounded-pill bg-accent text-white text-lead font-extrabold whitespace-nowrap shadow-glow
            hover:brightness-105 active:scale-95 transition-all duration-500
            ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
          <HiPlus size={19} />
          {fabLabel}
        </button>
      )}

      {!hideNavbar && (
        <nav aria-label="Main"
          className={`fixed bottom-0 inset-x-0 z-50 grid grid-cols-4 border-t border-border bg-bg
            pb-[env(safe-area-inset-bottom)] transition-transform duration-500
            ${mounted ? "translate-y-0" : "translate-y-full"}`}>
          {NAV.map(({ id, label }) => {
            const active = activeTab === id
            return (
              <button key={id} onClick={() => handleTabChange(id)}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center justify-center gap-1 min-h-16 px-2 py-2
                  select-none transition-colors duration-200
                  ${active ? "text-accent" : "text-sub hover:text-tx"}`}>
                <NavIcon id={id} active={active} size={22} />
                <span className="text-caption font-semibold leading-none">{label}</span>
                {id === "tasks" && openCount > 0 && !active && (
                  <span className="absolute top-1.5 right-1/2 -mr-4 min-w-4.5 h-4.5 px-1 rounded-pill
                    bg-accent text-white text-caption font-extrabold grid place-items-center tabular-nums leading-none">
                    {openCount > 99 ? "99+" : openCount}
                  </span>
                )}
                {id === "timer" && running && (
                  <span className="absolute top-2.5 right-1/2 -mr-3.5 w-2 h-2 rounded-pill bg-priority-low" />
                )}
              </button>
            )
          })}
        </nav>
      )}
    </div>
  )
}
