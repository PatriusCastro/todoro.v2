import { useEffect, useRef, useState } from "react"

type Tab = "home" | "tasks" | "timer" | "settings" | "calendar"

export function usePillAnimation(activeTab: Tab, mounted: boolean) {
  const containerRef = useRef<HTMLDivElement>(null)
  const btnRefs = useRef<Map<Tab, HTMLElement>>(new Map())
  const [pill, setPill] = useState({ left: 0, width: 0, ready: false })

  useEffect(() => {
    const container = containerRef.current
    const btn = btnRefs.current.get(activeTab)
    if (!container || !btn) return

    const cr = container.getBoundingClientRect()
    const br = btn.getBoundingClientRect()
    setPill({ left: br.left - cr.left, width: br.width, ready: true })
  }, [activeTab, mounted])

  return { containerRef, btnRefs, pill }
}
