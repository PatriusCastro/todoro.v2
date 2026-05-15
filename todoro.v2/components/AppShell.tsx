"use client"

import { useState, useEffect } from "react"
import { useIsTablet } from "../hooks/useMediaQuery"
import { usePillAnimation } from "../hooks/usePillAnimation"
import TaskModal from "./tasks/TaskModal"
import { type Task } from "./tasks/TaskCard"
import { HiHome, HiOutlineHome, HiClipboardList, HiOutlineClipboardList, HiClock, HiOutlineClock, HiCog, HiOutlineCog, HiOutlineCalendar, HiCalendar } from "react-icons/hi"
import { HiPlus } from "react-icons/hi2"

type Tab   = "home" | "tasks" | "timer" | "settings" | "calendar"
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
  hideNavbar?: boolean
  avatarUrl?:  string
  onAddTask:   (task: Task) => void
}

const NAV: { id: Tab; label: string }[] = [
  { id: "home",     label: "Home"  },
  { id: "tasks",    label: "Tasks" },
  { id: "timer",    label: "Timer" },
  { id: "calendar", label: "Calendar" },
  { id: "settings", label: "Me"    },
]

function NavIcon({ id, active }: { id: Tab; active: boolean }) {
  const sz = 20
  switch (id) {
    case "home":     return active ? <HiHome size={sz} />          : <HiOutlineHome size={sz} />
    case "tasks":    return active ? <HiClipboardList size={sz} /> : <HiOutlineClipboardList size={sz} />
    case "timer":    return active ? <HiClock size={sz} />         : <HiOutlineClock size={sz} />
    case "calendar": return active ? <HiCalendar size={sz} />      : <HiOutlineCalendar size={sz} />
    case "settings": return active ? <HiCog size={sz} />           : <HiOutlineCog size={sz} />
  }
}

export default function AppShell({
  children, activeTab, onTabChange, dark,
  userName, streak, running, phase, hideNavbar, avatarUrl, onAddTask,
}: AppShellProps) {
  const isTablet  = useIsTablet()
  const initials  = userName ? userName.slice(0, 2).toUpperCase() : "–"
  const [mounted, setMounted] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [animKey, setAnimKey] = useState(0)
  useEffect(() => { setTimeout(() => setMounted(true), 50) }, [])

  const { containerRef: navContainerRef, btnRefs, pill } = usePillAnimation(activeTab, mounted)
  const { containerRef: desktopNavRef, btnRefs: desktopBtnRefs, pill: desktopPill } = usePillAnimation(activeTab, mounted)

  const handleTabChange = (tab: Tab) => {
    if (tab === activeTab) return
    setAnimKey(k => k + 1)
    onTabChange(tab)
  }

  const ease       = "cubic-bezier(0.4,0,0.2,1)"
  const pillTrans  = `left 0.22s ${ease}, width 0.22s ${ease}`
  const dotColor   = phase === "focus" ? "bg-priority-low" : "bg-priority-low"

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
        {isTablet && !hideNavbar && (
          <header className={`fixed top-0 inset-x-0 z-50 flex items-center gap-3 w-full py-2 mx-auto bg-surface/90 backdrop-blur-xl
              transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3"}`}>
            <div className="max-w-7xl w-full h-12 mx-auto flex px-4 lg:px-8">   
              <div className="flex items-center gap-2 px-3 py-2 shrink-0">
                <img 
                  src={dark ? "/icons/todoro-light.png" : "/icons/todoro-dark.png"} 
                  alt="Todoro" 
                  className="w-5 h-5"
                />
                <span className="text-sm font-bold text-tx">Todoro</span>
              </div>

              <div className="flex-1 flex justify-center">
                <div ref={desktopNavRef}
                  className="relative flex items-center p-1">
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
                <button onClick={() => handleTabChange("settings")}
                  className="flex items-center gap-2 transition-opacity hover:opacity-75">
                  <div className="hidden lg:flex flex-col items-end">
                    <span className="text-xs font-bold text-tx leading-none">{userName}</span>
                    <span className="text-[10px] text-sub">{streak}d streak</span>
                  </div>
                  <AvatarEl size={28} />
                </button>
              </div>
            </div>
          </header>
        )}

        {/* Page content */}
        <main className={`flex-1 overflow-y-auto ${isTablet && !hideNavbar ? "pt-20" : ""} ${isTablet ? "" : "pb-20"}`}>
          <div key={animKey}
            style={{ animation: "tabenter 0.2s ease both" }}
            className="w-full max-w-7xl mx-auto px-4 lg:px-10 py-6">
            {children}
          </div>
        </main>

        {/* Mobile */}
        {!isTablet && !hideNavbar && (
          <div className={`fixed bottom-4 inset-x-0 z-50 flex justify-center px-4 pointer-events-none
            transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>

            <div ref={navContainerRef}
              className="w-full pointer-events-auto relative flex items-center justify-between bg-surface/95 backdrop-blur-md border border-border rounded-3xl p-2">

              {pill.ready && (
                <div className="absolute top-1.5 bottom-1.5 bg-surface2 rounded-2xl pointer-events-none"
                  style={{ left: pill.left, width: pill.width, transition: pillTrans }} />
              )}

              {NAV.map(({ id, label }) => {
                const active = activeTab === id
                const isMe   = id === "settings"
                return (
                  <button key={id}
                    ref={el => { if (el) btnRefs.current.set(id, el); else btnRefs.current.delete(id) }}
                    onClick={() => handleTabChange(id)}
                    className={`relative z-10 flex flex-col items-center justify-center gap-0.5
                      px-4 py-2 select-none transition-colors duration-300
                      ${active ? "text-accent scale-105" : "text-sub hover:text-tx"}`}>
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

        {!isTablet && activeTab === "tasks" && (
          <button
            onClick={() => setShowAdd(true)}
            className={`fixed bottom-24 right-4 z-40 flex items-center justify-center w-12 h-12 rounded-full bg-accent text-white text-sm font-black hover:bg-accent-hover active:scale-95 transition-all
              ${running ? "opacity-50 pointer-events-none" : ""}`}>
            <HiPlus size={16} />
          </button>
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