"use client"

import { useState, useEffect, useRef } from "react"
import { useIsTablet } from "../hooks/useMediaQuery"
import TaskModal from "./tasks/TaskModal"
import { type Task } from "./tasks/TaskCard"
import { HiHome, HiOutlineHome, HiClipboardList, HiOutlineClipboardList, HiClock, HiOutlineClock, HiCog, HiOutlineCog } from "react-icons/hi"
import { HiPlus } from "react-icons/hi2"

type Tab   = "home" | "tasks" | "timer" | "settings"
type Phase = "focus" | "break" | "longbreak"

interface AppShellProps {
  children:    React.ReactNode
  activeTab:   Tab
  onTabChange: (tab: Tab) => void
  dark:        boolean
  userName:    string
  streak:      number
  running:     boolean
  phase:       Phase
  avatarUrl?:  string
  onAddTask:   (task: Task) => void
}

const NAV: { id: Tab; label: string }[] = [
  { id: "home",     label: "Home"  },
  { id: "tasks",    label: "Tasks" },
  { id: "timer",    label: "Timer" },
  { id: "settings", label: "Me"    },
]

function NavIcon({ id, active }: { id: Tab; active: boolean }) {
  const sz = 20
  switch (id) {
    case "home":     return active ? <HiHome size={sz} />          : <HiOutlineHome size={sz} />
    case "tasks":    return active ? <HiClipboardList size={sz} /> : <HiOutlineClipboardList size={sz} />
    case "timer":    return active ? <HiClock size={sz} />         : <HiOutlineClock size={sz} />
    case "settings": return active ? <HiCog size={sz} />           : <HiOutlineCog size={sz} />
  }
}

export default function AppShell({
  children, activeTab, onTabChange, dark,
  userName, streak, running, phase, avatarUrl, onAddTask,
}: AppShellProps) {
  const isTablet  = useIsTablet()
  const initials  = userName ? userName.slice(0, 2).toUpperCase() : "–"
  const [mounted, setMounted] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [animKey, setAnimKey] = useState(0)
  useEffect(() => { setTimeout(() => setMounted(true), 50) }, [])

  // Sliding indicator state — tracks the active button's position
  const navContainerRef                        = useRef<HTMLDivElement>(null)
  const btnRefs                                = useRef<Map<Tab, HTMLElement>>(new Map())
  const [pill, setPill]                        = useState({ left: 0, width: 0, ready: false })

  useEffect(() => {
    const container = navContainerRef.current
    const btn       = btnRefs.current.get(activeTab)
    if (!container || !btn) return
    const cr = container.getBoundingClientRect()
    const br = btn.getBoundingClientRect()
    setPill({ left: br.left - cr.left, width: br.width, ready: true })
  }, [activeTab, mounted])

  // Same for desktop nav
  const desktopNavRef                          = useRef<HTMLDivElement>(null)
  const desktopBtnRefs                         = useRef<Map<Tab, HTMLElement>>(new Map())
  const [desktopPill, setDesktopPill]          = useState({ left: 0, width: 0, ready: false })

  useEffect(() => {
    const container = desktopNavRef.current
    const btn       = desktopBtnRefs.current.get(activeTab)
    if (!container || !btn) return
    const cr = container.getBoundingClientRect()
    const br = btn.getBoundingClientRect()
    setDesktopPill({ left: br.left - cr.left, width: br.width, ready: true })
  }, [activeTab, mounted])

  const handleTabChange = (tab: Tab) => {
    if (tab === activeTab) return
    setAnimKey(k => k + 1)
    onTabChange(tab)
  }

  const ease       = "cubic-bezier(0.4,0,0.2,1)"
  const pillTrans  = `left 0.22s ${ease}, width 0.22s ${ease}`
  const dotColor   = phase === "focus" ? "bg-accent" : "bg-priority-low"
  const statusCls  = phase === "focus"
    ? "bg-accent/10 text-accent border-accent/20"
    : "bg-priority-low/10 text-priority-low border-priority-low/20"
  const statusText = phase === "focus" ? "Focusing" : "Resting"

  const AvatarEl = ({ size = 32 }: { size?: number }) => (
    <div style={{ width: size, height: size }}
      className={`rounded-xl overflow-hidden shrink-0 border-2 transition-colors duration-300
        ${running ? (phase === "focus" ? "border-accent" : "border-priority-low") : "border-border"}`}>
      {avatarUrl
        ? <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
        : <div className="w-full h-full bg-surface2 flex items-center justify-center text-sub font-black"
            style={{ fontSize: size * 0.3 }}>
            {initials}
          </div>
      }
    </div>
  )

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-dvh bg-bg text-tx flex flex-col">

        {/* Desktop */}
        {isTablet && (
          <header className={`fixed top-0 inset-x-0 z-50 h-20 flex items-center px-6 gap-3 max-w-4xl mx-auto
            transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3"}`}>

            <div className="flex items-center gap-2 px-3 py-2 shrink-0">
              <div className="w-6 h-6 rounded-lg bg-accent flex items-center justify-center">
                <HiClock size={13} color="white" />
              </div>
              <span className="font-black text-sm tracking-tight text-tx">Todoro</span>
            </div>

            <div className="flex-1 flex justify-center">
              <div ref={desktopNavRef}
                className="relative flex items-center p-1 rounded-2xl bg-surface/90 backdrop-blur-xl border border-border">
                {desktopPill.ready && (
                  <div className="absolute top-1 bottom-1 bg-surface2 rounded-xl pointer-events-none"
                    style={{ left: desktopPill.left, width: desktopPill.width, transition: pillTrans }} />
                )}
                {NAV.map(({ id, label }) => {
                  const active = activeTab === id
                  return (
                    <button key={id}
                      ref={el => { if (el) desktopBtnRefs.current.set(id, el); else desktopBtnRefs.current.delete(id) }}
                      onClick={() => handleTabChange(id)}
                      className={`relative z-10 flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm font-semibold
                        select-none transition-colors duration-150
                        ${active ? "text-tx" : "text-sub hover:text-tx"}`}>
                      <NavIcon id={id} active={active} />
                      {label === "Me" ? "Settings" : label}
                      {id === "timer" && running && (
                        <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-bg ${dotColor}`} />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center gap-2.5 px-3 py-2 shrink-0">
              {running && (
                <div className={`hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-semibold ${statusCls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${dotColor}`} />
                  {statusText}
                </div>
              )}
              <button onClick={() => handleTabChange("settings")}
                className="flex items-center gap-2 transition-opacity hover:opacity-75">
                <div className="hidden lg:flex flex-col items-end">
                  <span className="text-xs font-bold text-tx leading-none">{userName}</span>
                  <span className="text-[10px] text-sub">{streak}d streak</span>
                </div>
                <AvatarEl size={28} />
              </button>
            </div>
          </header>
        )}

        {/* Page content */}
        <main className={`flex-1 overflow-y-auto ${isTablet ? "pt-14" : "pb-32"}`}>
          <div key={animKey}
            style={{ animation: "tabenter 0.2s ease both" }}
            className="w-full max-w-4xl mx-auto px-4 md:px-8 py-6">
            {children}
          </div>
        </main>

        {/* Mobile */}
        {!isTablet && (
          <div className={`fixed bottom-4 inset-x-0 z-50 flex justify-center px-4 pointer-events-none
            transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>

            <div ref={navContainerRef}
              className="pointer-events-auto relative flex items-center bg-surface/95 backdrop-blur-xl border border-border rounded-3xl p-2">

              {pill.ready && (
                <div className="absolute top-1.5 bottom-1.5 bg-surface2 rounded-2xl pointer-events-none"
                  style={{ left: pill.left, width: pill.width, transition: pillTrans }} />
              )}

              {NAV.slice(0, 2).map(({ id, label }) => {
                const active = activeTab === id
                return (
                  <button key={id}
                    ref={el => { if (el) btnRefs.current.set(id, el); else btnRefs.current.delete(id) }}
                    onClick={() => handleTabChange(id)}
                    className={`relative z-10 flex flex-col items-center justify-center gap-0.5
                      px-4 py-2 select-none transition-colors duration-150
                      ${active ? "text-tx" : "text-sub hover:text-tx"}`}>
                    <NavIcon id={id} active={active} />
                    <span className="font-semibold leading-none text-[9px]">{label}</span>
                  </button>
                )
              })}

              <button onClick={() => setShowAdd(true)}
                className="relative z-10 w-10 h-10 mx-1.5 rounded-full border-2 border-accent text-tx
                  flex items-center justify-center shrink-0
                  active:scale-95 transition-all duration-150 hover:bg-surface2">
                <HiPlus size={20} />
              </button>

              {NAV.slice(2).map(({ id, label }) => {
                const active = activeTab === id
                const isMe   = id === "settings"
                return (
                  <button key={id}
                    ref={el => { if (el) btnRefs.current.set(id, el); else btnRefs.current.delete(id) }}
                    onClick={() => handleTabChange(id)}
                    className={`relative z-10 flex flex-col items-center justify-center gap-0.5
                      px-4 py-2 select-none transition-colors duration-150
                      ${active ? "text-tx" : "text-sub hover:text-tx"}`}>
                    {isMe
                      ? <span className={`w-5 h-5 rounded-lg overflow-hidden border block
                          ${active ? "border-border" : "border-border/50"}`}>
                          {avatarUrl
                            ? <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
                            : <span className="w-full h-full flex items-center justify-center font-black text-[8px] bg-surface2 text-sub">
                                {initials}
                              </span>
                          }
                        </span>
                      : <NavIcon id={id} active={active} />
                    }
                    <span className="font-semibold leading-none text-[9px]">{label}</span>
                    {id === "timer" && running && (
                      <span className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${dotColor}`} />
                    )}
                  </button>
                )
              })}

            </div>
          </div>
        )}

        {showAdd && (
          <TaskModal
            dark={dark}
            onSave={task => { onAddTask(task); setShowAdd(false) }}
            onClose={() => setShowAdd(false)} />
        )}

      </div>
    </div>
  )
}