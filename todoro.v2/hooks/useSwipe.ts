import { useRef, useCallback } from "react"

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
  const el      = useRef<HTMLDivElement>(null)
  const startX  = useRef(0)
  const startY  = useRef(0)
  const active  = useRef(false)
  const axis    = useRef<"x" | "y" | null>(null)

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

  const snapBack = useCallback(() => {
    active.current = false
    axis.current   = null
    setStyle(0, true)
  }, [])

  const flyOutLeft = useCallback((cb: () => void) => {
    const node = el.current
    if (!node) return
    node.style.transition = "transform 0.22s ease-in, opacity 0.22s ease-in"
    node.style.transform  = "translateX(-300px)"
    node.style.opacity    = "0"
    active.current = false
    axis.current   = null
    setTimeout(cb, 210)
  }, [])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    startX.current = e.clientX
    startY.current = e.clientY
    active.current = true
    axis.current   = null
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
    e.preventDefault()

    const rubber = dx > maxDrag  ? maxDrag  + (dx - maxDrag)  * 0.12
                 : dx < -maxDrag ? -maxDrag + (dx + maxDrag) * 0.12
                 : dx
    setStyle(rubber)
  }, [maxDrag])

  const onPointerUp = useCallback(() => {
    if (!active.current || axis.current !== "x") { snapBack(); return }

    const node = el.current
    if (!node) return
    const x = new DOMMatrix(getComputedStyle(node).transform).m41

    if (x > threshold && onSwipeRight) {
      snapBack()
      onSwipeRight()
    } else if (x < -threshold && onSwipeLeft) {
      flyOutLeft(onSwipeLeft)
    } else {
      snapBack()
    }
  }, [threshold, onSwipeLeft, onSwipeRight, snapBack, flyOutLeft])

  return {
    ref: el,
    swipeHandlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: snapBack },
  }
}