"use client"

import { useEffect, useRef, useCallback } from "react"

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
}

// Renders the mini timer UI as raw HTML/CSS into the PiP window.
// We do this imperatively (no React portal) because the PiP window is
// a separate browsing context — React can't reach into it directly.
function buildPiPHTML(s: PiPState): string {
  const accent    = "#5B8CFF"
  const green     = "#34D399"
  const strokeClr = s.phase === "focus" ? accent : green
  const bg        = s.dark ? "#0F0F0F" : "#FFFFFF"
  const surface   = s.dark ? "#111111" : "#F1EFEA"
  const tx        = s.dark ? "#E6EAF2" : "#1C1917"
  const sub       = s.dark ? "#9AA4B2" : "#78716C"
  const border    = s.dark ? "rgba(255,255,255,0.06)" : "#E5E1D8"
  const ring      = s.dark ? "rgba(255,255,255,0.08)" : "#e7e3dc"

  const mins = Math.floor(s.time / 60)
  const secs = s.time % 60
  const clock = `${mins}:${String(secs).padStart(2, "0")}`

  const phaseLabel = s.phase === "focus" ? "Focus" : s.phase === "longbreak" ? "Long Break" : "Break"
  const phaseDot   = s.phase === "focus" ? accent : green
  const pulseCss   = s.running ? "animation:pulse 1.5s ease-in-out infinite;" : ""

  // SVG arc
  const size = 120, cx = 60, r = 50
  const C = 2 * Math.PI * r
  const offset = C * (1 - s.progress)

  const playIcon  = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`
  const pauseIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`
  const skipIcon  = `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z"/></svg>`

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
  html,body{width:100%;height:100%;overflow:hidden;font-family:'Segoe UI',system-ui,sans-serif;background:${bg};}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  .wrap{display:flex;align-items:center;justify-content:center;height:100%;gap:10px;padding:12px;}
  .top{display:flex;flex-direction:column;align-items:center;gap:6px;}
  .phase{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:${sub};}
  .dot{width:6px;height:6px;border-radius:50%;background:${phaseDot};${pulseCss}}
  .ring{position:relative;width:${size}px;height:${size}px;}
  .ring svg{transform:rotate(-90deg);}
  .clock{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;}
  .time{font-size:1.75rem;font-weight:900;letter-spacing:-.03em;color:${tx};font-variant-numeric:tabular-nums;}
  .task{font-size:9px;color:${sub};max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;}
  .controls{display:flex;align-items:center;gap:8px;}
  .btn{display:flex;align-items:center;justify-content:center;border:none;cursor:pointer;transition:opacity .15s;}
  .btn:active{opacity:.6;}
  .play{width:44px;height:44px;border-radius:50%;background:${strokeClr};color:#fff;}
  .skip{width:30px;height:30px;border-radius:50%;background:${surface};border:1px solid ${border};color:${sub};}
</style></head><body>
<div class="wrap">
  <div class="top">
    <div class="phase"><span class="dot"></span>${phaseLabel}</div>
        <div class="ring">
            <svg width="${size}" height="${size}">
            <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${ring}" stroke-width="8"/>
            <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${strokeClr}" stroke-width="6"
                stroke-linecap="round" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"
                style="transition:stroke-dashoffset 1s linear;"/>
            </svg>
            <div class="clock">
            <span class="time">${clock}</span>
        </div>
    </div>
  </div>
  ${s.taskTitle ? `<div class="task">${s.taskTitle}</div>` : ""}
  <div class="controls">
    <button class="btn play" id="toggleBtn">${s.running ? pauseIcon : playIcon}</button>
    <button class="btn skip" id="skipBtn">${skipIcon}</button>
  </div>
</div>
<script>
  document.getElementById('toggleBtn').onclick = () => window.opener?.postMessage({type:'pip-toggle'},'*');
  document.getElementById('skipBtn').onclick   = () => window.opener?.postMessage({type:'pip-skip'},'*');
</script>
</body></html>`
}

export function usePiP(state: PiPState, { onToggle, onSkip }: UsePiPOptions) {
  const pipWinRef  = useRef<Window | null>(null)
  const supportsPiP = typeof window !== "undefined" && "documentPictureInPicture" in window

  // Listen for messages from PiP window
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "pip-toggle") onToggle()
      if (e.data?.type === "pip-skip")   onSkip()
    }
    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [onToggle, onSkip])

  // Sync state into open PiP window
  useEffect(() => {
    const win = pipWinRef.current
    if (!win || win.closed) return
    try {
      win.document.open()
      win.document.write(buildPiPHTML(state))
      win.document.close()
    } catch {}
  }, [state])

  const open = useCallback(async () => {
    if (!supportsPiP) return false
    try {
      // @ts-expect-error — documentPictureInPicture not yet in TS lib
      const pip = await window.documentPictureInPicture.requestWindow({
        width: 200, height: 260,
      })
      pipWinRef.current = pip
      pip.document.open()
      pip.document.write(buildPiPHTML(state))
      pip.document.close()
      pip.addEventListener("pagehide", () => { pipWinRef.current = null })
      return true
    } catch { return false }
  }, [state, supportsPiP])

  const close = useCallback(() => {
    try { pipWinRef.current?.close() } catch {}
    pipWinRef.current = null
  }, [])

  const isOpen = () => !!pipWinRef.current && !pipWinRef.current.closed

  return { open, close, isOpen, supportsPiP }
}