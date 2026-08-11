"use client"

import { useEffect, useRef, useCallback, useState } from "react"

type Phase = "focus" | "break" | "longbreak"

interface PiPState {
  time:     number
  phase:    Phase
  running:  boolean
  progress: number
  taskTitle: string
  dark:     boolean
}

interface UsePiPOptions {
  onToggle: () => void
  onSkip:   () => void
  /**
   * Open by itself when the app is hidden, close when it comes back.
   *
   * There is exactly one sanctioned way to do this: `requestWindow()` needs
   * transient user activation, so calling it from a visibilitychange handler is
   * refused — by then the click that would have authorised it is long gone.
   * Chrome's Auto-PiP instead invokes the `enterpictureinpicture` media-session
   * action on the app's behalf, and *that* callback is allowed to open a
   * window. It fires only for an installed PWA; in an ordinary browser tab the
   * action is never called and the manual button remains the only way in.
   */
  auto?: boolean
}

const SIZE = 120, CX = 60, R = 50
const CIRC = 2 * Math.PI * R

/** The PiP window is a separate document and inherits none of the app's CSS. */
function palette(dark: boolean) {
  const read = (name: string, fallback: string) => {
    if (typeof window === "undefined") return fallback
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    return v || fallback
  }
  return {
    // Read live rather than hardcoded: the accent is a user choice (eight
    // presets plus a custom colour) and a blue ring floating over a pink app
    // looks like a different product.
    accent: read("--accent", "#5B8CFF"),
    green:  read("--color-priority-low", "#34D399"),
    bg:      dark ? "#0F0F0F" : "#FFFFFF",
    surface: dark ? "#111111" : "#F1EFEA",
    tx:      dark ? "#E6EAF2" : "#1C1917",
    sub:     dark ? "#9AA4B2" : "#78716C",
    border:  dark ? "rgba(255,255,255,0.06)" : "#E5E1D8",
    ring:    dark ? "rgba(255,255,255,0.08)" : "#e7e3dc",
  }
}

const ICONS = {
  play:  `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
  pause: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`,
  skip:  `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z"/></svg>`,
}

/**
 * Written once per window. Everything that changes is a CSS variable or a text
 * node, updated in place by paint() — the previous version rewrote the whole
 * document every second, which meant the ring's one-second transition never had
 * a document old enough to animate in.
 */
function shell(): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
  html,body{width:100%;height:100%;overflow:hidden;font-family:'Segoe UI',system-ui,sans-serif;background:var(--bg);}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  .wrap{display:flex;align-items:center;justify-content:center;height:100%;gap:12px;padding:12px;}
  .top{display:flex;flex-direction:column;align-items:center;gap:6px;}
  .phase{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:var(--sub);}
  .dot{width:6px;height:6px;border-radius:50%;background:var(--stroke);}
  .dot.on{animation:pulse 1.5s ease-in-out infinite;}
  .ring{position:relative;width:${SIZE}px;height:${SIZE}px;}
  .ring svg{transform:rotate(-90deg);}
  .clock{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;}
  .time{font-size:1.75rem;font-weight:900;letter-spacing:-.03em;color:var(--tx);font-variant-numeric:tabular-nums;}
  .side{display:flex;flex-direction:column;align-items:center;gap:8px;min-width:0;}
  .task{font-size:9px;color:var(--sub);max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;}
  .task:empty{display:none;}
  .controls{display:flex;align-items:center;gap:8px;}
  .btn{display:flex;align-items:center;justify-content:center;border:none;cursor:pointer;transition:opacity .15s;}
  .btn:active{opacity:.6;}
  .play{width:44px;height:44px;border-radius:50%;background:var(--stroke);color:#fff;}
  .skip{width:30px;height:30px;border-radius:50%;background:var(--surface);border:1px solid var(--border);color:var(--sub);}
</style></head><body>
<div class="wrap">
  <div class="top">
    <div class="phase"><span class="dot" id="dot"></span><span id="phase"></span></div>
    <div class="ring">
      <svg width="${SIZE}" height="${SIZE}">
        <circle cx="${CX}" cy="${CX}" r="${R}" fill="none" stroke="var(--track)" stroke-width="8"/>
        <circle id="arc" cx="${CX}" cy="${CX}" r="${R}" fill="none" stroke="var(--stroke)" stroke-width="6"
          stroke-linecap="round" stroke-dasharray="${CIRC.toFixed(2)}"
          style="transition:stroke-dashoffset 1s linear;"/>
      </svg>
      <div class="clock"><span class="time" id="time"></span></div>
    </div>
  </div>
  <div class="side">
    <div class="task" id="task"></div>
    <div class="controls">
      <button class="btn play" id="toggleBtn" aria-label="Play or pause"></button>
      <button class="btn skip" id="skipBtn" aria-label="Skip"></button>
    </div>
  </div>
</div>
<script>
  document.getElementById('toggleBtn').onclick = () => window.opener?.postMessage({type:'pip-toggle'},'*');
  document.getElementById('skipBtn').onclick   = () => window.opener?.postMessage({type:'pip-skip'},'*');
</script>
</body></html>`
}

/** Idempotent: safe to call on every tick, touches only what changed. */
function paint(win: Window, s: PiPState) {
  const doc = win.document
  const el = (id: string) => doc.getElementById(id)
  if (!el("time")) return                      // shell not written yet

  const p = palette(s.dark)
  const stroke = s.phase === "focus" ? p.accent : p.green
  const vars = doc.documentElement.style
  vars.setProperty("--stroke",  stroke)
  vars.setProperty("--bg",      p.bg)
  vars.setProperty("--surface", p.surface)
  vars.setProperty("--tx",      p.tx)
  vars.setProperty("--sub",     p.sub)
  vars.setProperty("--border",  p.border)
  vars.setProperty("--track",   p.ring)

  const mins = Math.floor(s.time / 60)
  el("time")!.textContent = `${mins}:${String(s.time % 60).padStart(2, "0")}`
  el("phase")!.textContent =
    s.phase === "focus" ? "Focus" : s.phase === "longbreak" ? "Long Break" : "Break"
  el("dot")!.className = `dot${s.running ? " on" : ""}`
  el("task")!.textContent = s.taskTitle
  el("arc")!.setAttribute("stroke-dashoffset", (CIRC * (1 - s.progress)).toFixed(2))
  el("toggleBtn")!.innerHTML = s.running ? ICONS.pause : ICONS.play
  el("skipBtn")!.innerHTML = ICONS.skip
}

export function usePiP(state: PiPState, { onToggle, onSkip, auto = false }: UsePiPOptions) {
  const pipWinRef = useRef<Window | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  // A window the app opened by itself is transient and closes on return. One
  // the user asked for stays until they say otherwise — silently shutting it
  // the moment they glance back at the app would be taking away a thing they
  // deliberately placed.
  const autoOpenedRef = useRef(false)
  const supportsPiP = typeof window !== "undefined" && "documentPictureInPicture" in window

  // The handlers below are registered once but must see the current timer, so
  // the state rides a ref rather than the dependency array.
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state })

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "pip-toggle") onToggle()
      if (e.data?.type === "pip-skip")   onSkip()
    }
    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [onToggle, onSkip])

  useEffect(() => {
    const win = pipWinRef.current
    if (!win || win.closed) return
    try { paint(win, state) } catch {}
  }, [state])

  const open = useCallback(async (viaAuto = false) => {
    if (!supportsPiP) return false
    const live = pipWinRef.current
    if (live && !live.closed) return true
    try {
      // @ts-expect-error — documentPictureInPicture not yet in TS lib
      const pip: Window = await window.documentPictureInPicture.requestWindow({
        width: 360, height: 200,
      })
      pipWinRef.current = pip
      autoOpenedRef.current = viaAuto
      pip.document.open()
      pip.document.write(shell())
      pip.document.close()
      paint(pip, stateRef.current)
      pip.addEventListener("pagehide", () => { pipWinRef.current = null; setIsOpen(false) })
      setIsOpen(true)
      return true
    } catch { return false }
  }, [supportsPiP])

  const close = useCallback(() => {
    try { pipWinRef.current?.close() } catch {}
    pipWinRef.current = null
    autoOpenedRef.current = false
    setIsOpen(false)
  }, [])

  // Chrome calls this when an installed PWA is hidden. Registering it is also
  // what opts the app into Auto-PiP — there is no separate switch.
  useEffect(() => {
    if (!auto || !supportsPiP || typeof navigator === "undefined") return
    if (!("mediaSession" in navigator)) return
    const ms = navigator.mediaSession as MediaSession & {
      setActionHandler(action: string, handler: (() => void) | null): void
    }
    try {
      ms.setActionHandler("enterpictureinpicture", () => { void open(true) })
    } catch {
      return   // older Chrome throws TypeError on an unknown action name
    }
    return () => { try { ms.setActionHandler("enterpictureinpicture", null) } catch {} }
  }, [auto, supportsPiP, open])

  // Coming back is the cue to put it away again — but only for a window this
  // hook opened on its own.
  useEffect(() => {
    if (!auto) return
    const onVisible = () => {
      if (document.visibilityState === "visible" && autoOpenedRef.current) close()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [auto, close])

  return { open, close, isOpen, supportsPiP }
}
