"use client"

import { useState, useEffect } from "react"
import { useIsTablet } from "../hooks/useMediaQuery"
import { HiHome, HiOutlineHome, HiClipboardList, HiOutlineClipboardList, HiClock, HiOutlineClock, HiCog, HiOutlineCog } from "react-icons/hi"
import { HiPlus, HiOutlineChevronDoubleLeft, HiOutlineChevronDoubleRight } from "react-icons/hi2"

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

// ── Rail geometry ──────────────────────────────────────────────────────────
// One source of truth for the two widths, because the rail is fixed-position
// and the content column pays for it with a matching margin. When those two
// numbers drift the page sits under the rail — so they are written once.
const RAIL   = { open: "w-59", closed: "w-18" }
const RAIL_ML = { open: "ml-59", closed: "ml-18" }
// Brand block and top bar share this height so their hairlines meet exactly.
const BAR_H  = "h-18"
const RAIL_KEY = "todoro:railCollapsed"

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
  // Read on first render rather than in an effect, so a collapsed rail paints
  // collapsed and has nothing to animate open. Safe against hydration: the rail
  // is behind `isTablet`, which is false until its own effect runs, so this
  // never changes the server tree.
  const [railClosed, setRailClosed] = useState(() => {
    try { return localStorage.getItem(RAIL_KEY) === "1" } catch { return false }
  })
  useEffect(() => { setTimeout(() => setMounted(true), 50) }, [])

  const toggleRail = () => setRailClosed(closed => {
    const next = !closed
    try { localStorage.setItem(RAIL_KEY, next ? "1" : "0") } catch {}
    return next
  })

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
    // Every row in the rail is `px-5` with a 20px icon box, so the logo, the
    // four nav icons and the collapse chevron share one left edge — and their
    // labels share a second one. Collapsed, the same rows centre themselves.
    const row = railClosed ? "justify-center px-0" : "px-5"

    return (
      <div className="min-h-dvh bg-bg text-tx flex">

        {!hideNavbar && (
        <nav aria-label="Main"
          className={`fixed inset-y-0 left-0 flex flex-col border-r border-border bg-bg z-40
            transition-[width] duration-200 ${railClosed ? RAIL.closed : RAIL.open}`}>

          <div className={`${BAR_H} shrink-0 flex items-center border-b border-border ${row}`}>
            <img src={dark ? "/icons/todoro-light.png" : "/icons/todoro-dark.png"} alt=""
              className="w-5 h-5 shrink-0" />
            {!railClosed && (
              <span className="ml-3 min-w-0">
                <span className="block text-heading font-extrabold text-tx leading-none truncate">Todoro</span>
                <span className="block text-caption uppercase tracking-wider text-sub mt-1.5 truncate">
                  Focus &amp; tasks
                </span>
              </span>
            )}
          </div>

          <div className="flex flex-col py-3">
            {NAV.map(({ id, label }) => {
              const active = activeTab === id
              const badge  = id === "tasks" && openCount > 0 ? String(openCount) : null
              return (
                <button key={id} onClick={() => handleTabChange(id)}
                  aria-current={active ? "page" : undefined}
                  title={railClosed ? label : undefined}
                  className={`relative flex items-center w-full min-h-12 text-lead font-extrabold
                    transition-colors duration-150 ${row}
                    ${active ? "text-accent" : "text-tx hover:text-accent"}`}>
                  {/* Absolute, so the marker never shifts the icons out of line */}
                  <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-chip
                    ${active ? "bg-accent" : "bg-transparent"}`} />
                  <span className="relative w-5 h-5 shrink-0 grid place-items-center">
                    <NavIcon id={id} active={active} size={20} />
                    {/* Collapsed, the count and the running dot ride the icon —
                        there is no label left to sit beside. */}
                    {railClosed && badge && (
                      <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-pill bg-accent
                        text-white text-caption font-extrabold grid place-items-center tabular-nums leading-none">
                        {openCount > 99 ? "99+" : badge}
                      </span>
                    )}
                    {railClosed && id === "timer" && running && (
                      <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-pill bg-priority-low" />
                    )}
                  </span>
                  {!railClosed && (
                    <>
                      <span className="ml-3 flex-1 text-left truncate">{label}</span>
                      {badge && (
                        <span className={`text-meta font-semibold tabular-nums ${active ? "text-accent" : "text-sub"}`}>
                          {badge}
                        </span>
                      )}
                      {id === "timer" && running && (
                        <span className="w-2 h-2 rounded-pill bg-priority-low shrink-0" />
                      )}
                    </>
                  )}
                </button>
              )
            })}
          </div>

          <button onClick={toggleRail}
            aria-expanded={!railClosed}
            aria-label={railClosed ? "Expand sidebar" : "Collapse sidebar"}
            title={railClosed ? "Expand sidebar" : "Collapse sidebar"}
            className={`mt-auto flex items-center w-full min-h-11 text-sub
              hover:text-tx transition-colors duration-150 ${row}`}>
            <span className="w-5 h-5 shrink-0 grid place-items-center">
              {railClosed ? <HiOutlineChevronDoubleRight size={17} /> : <HiOutlineChevronDoubleLeft size={17} />}
            </span>
            {!railClosed && <span className="ml-3 text-meta font-semibold truncate">Collapse</span>}
          </button>

          <button onClick={() => handleTabChange("settings")}
            title={railClosed ? userName : undefined}
            className={`flex items-center py-4 border-t border-border text-left
              hover:opacity-75 transition-opacity ${row}`}>
            <Avatar userName={userName} avatarUrl={avatarUrl} size={railClosed ? 32 : 38} ring={avatarRing} />
            {!railClosed && (
              <span className="ml-3 min-w-0">
                <span className="block text-meta font-extrabold text-tx leading-tight truncate">{userName}</span>
                <span className="block text-caption text-sub truncate">Lv {level} · {streak}d streak</span>
              </span>
            )}
          </button>
        </nav>
        )}

        <div className={`flex-1 flex flex-col min-w-0 transition-[margin] duration-200
          ${hideNavbar ? "" : railClosed ? RAIL_ML.closed : RAIL_ML.open}`}>
          {!hideNavbar && (
          <header className={`sticky top-0 z-30 border-b border-border bg-bg
            transition-opacity duration-500 ${mounted ? "opacity-100" : "opacity-0"}`}>
            {/* Same width and inset as `pageInner`, so the title sits on the
                page's own left edge instead of 8px inside it. */}
            <div className={`w-full max-w-7xl mx-auto px-4 lg:px-8 ${BAR_H} flex items-center gap-4`}>
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
            </div>
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
