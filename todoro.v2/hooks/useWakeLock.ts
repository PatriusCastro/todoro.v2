"use client"

import { useEffect, useRef } from "react"

export function useWakeLock(active: boolean) {
  const lockRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (!("wakeLock" in navigator)) return

    const acquire = async () => {
      try {
        lockRef.current = await navigator.wakeLock.request("screen")
      } catch {}
    }

    const release = async () => {
      try {
        await lockRef.current?.release()
        lockRef.current = null
      } catch {}
    }

    // Re-acquire when tab becomes visible again (required by the WakeLock API)
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && active) acquire()
    }

    if (active) acquire()
    else release()

    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => {
      release()
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [active])
}