"use client"

import { useState, useEffect } from "react"
import { breakpoints } from "@/lib/theme"

export function useMediaQuery(minWidth: number) {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${minWidth}px)`)
    setMatches(mq.matches)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [minWidth])

  return matches
}

// Convenience shorthands
export const useIsTablet  = () => useMediaQuery(breakpoints.md)
export const useIsDesktop = () => useMediaQuery(breakpoints.lg)