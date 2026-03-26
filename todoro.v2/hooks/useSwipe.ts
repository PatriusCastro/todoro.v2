import { useRef, useCallback, useEffect } from "react"

interface SwipeOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  threshold?: number
  maxDrag?: number
}

export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  threshold = 72,
  maxDrag   = 110,
}: SwipeOptions) {
  const el       = useRef<HTMLDivElement>(null)
  const startX   = useRef(0)
  const startY   = useRef(0)
  const active   = useRef(false)
  const axis     = useRef<"x" | "y" | null>(null)
  const capturedPointerId = useRef<number | null>(null)

  const onSwipeLeftRef  = useRef(onSwipeLeft)
  const onSwipeRightRef = useRef(onSwipeRight)
  useEffect(() => { onSwipeLeftRef.current  = onSwipeLeft  }, [onSwipeLeft])
  useEffect(() => { onSwipeRightRef.current = onSwipeRight }, [onSwipeRight])

  const AXIS_LOCK = 8

  const setStyle = (x: number, animated = false) => {
    const node = el.current
    if (!node) return
    node.style.transition = animated
      ? "transform 0.32s cubic-bezier(0.34,1.4,0.64,1), opacity 0.28s ease"
      : "none"
    node.style.transform = `translateX(${x}px)`
    node.style.opacity   = `${Math.max(0.35, 1 - Math.abs(x) / 180)}`
  }

  const reset = useCallback(() => {
    active.current = false
    axis.current   = null

    if (capturedPointerId.current !== null && el.current) {
      try { el.current.releasePointerCapture(capturedPointerId.current) } catch {}
      capturedPointerId.current = null
    }
    setStyle(0, true)
  }, [])

  const flyOut = useCallback((dir: "left" | "right", cb: () => void) => {
    const node = el.current
    if (!node) return
    node.style.transition = "transform 0.22s ease-in, opacity 0.22s ease-in"
    node.style.transform  = `translateX(${dir === "left" ? -280 : 280}px)`
    node.style.opacity    = "0"
    active.current = false
    axis.current   = null
    capturedPointerId.current = null
    setTimeout(cb, 200)
  }, [])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    startX.current = e.clientX
    startY.current = e.clientY
    active.current = true
    axis.current   = null
    capturedPointerId.current = e.pointerId
    el.current?.setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!active.current) return
    const dx = e.clientX - startX.current
    const dy = e.clientY - startY.current

    if (!axis.current) {
      if (Math.hypot(dx, dy) < AXIS_LOCK) return
      axis.current = Math.abs(dx) >= Math.abs(dy) * 1.2 ? "x" : "y"
    }

    if (axis.current !== "x") return

    const clamped = Math.sign(dx) * Math.min(Math.abs(dx), maxDrag)
    const rubber  = dx >  maxDrag ?  maxDrag + (dx - maxDrag)  * 0.12
                  : dx < -maxDrag ? -maxDrag + (dx + maxDrag)  * 0.12
                  : clamped
    setStyle(rubber)
  }, [maxDrag])

  const onPointerUp = useCallback(() => {
    if (!active.current || axis.current !== "x") { reset(); return }

    const node = el.current
    if (!node) return
    const x = new DOMMatrix(getComputedStyle(node).transform).m41

    if      (x >  threshold && onSwipeRightRef.current) flyOut("right", onSwipeRightRef.current)
    else if (x < -threshold && onSwipeLeftRef.current)  flyOut("left",  onSwipeLeftRef.current)
    else                                                 reset()
  }, [threshold, reset, flyOut])

  useEffect(() => {
    const node = el.current
    if (!node) return
    const handleNativeMove = (e: PointerEvent) => {
      if (active.current && axis.current === "x") e.preventDefault()
    }
    node.addEventListener("pointermove", handleNativeMove, { passive: false })
    return () => node.removeEventListener("pointermove", handleNativeMove)
  }, [])

  return {
    ref: el,
    swipeHandlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: reset },
  }
}